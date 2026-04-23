import type { EditorView } from '@codemirror/view';
import {
	MarkdownPostProcessorContext,
	MarkdownView,
	Plugin,
	TFile,
	WorkspaceLeaf,
	parseLinktext as ParseLinktext,
} from 'obsidian';
import {
	FILE_MODIFY_DEBOUNCE_MS,
	HTML_LOAD_FAILURE_TIMEOUT_MS,
	RENDERED_HTML_CACHE_VERSION,
	VIEW_TYPE_HTML,
	IsHtmlEmbedExtension,
} from './Constants';
import { HTMLEmbedRenderer } from './HTMLEmbedRenderer';
import { HTMLFileView } from './HTMLFileView';
import { HtmlCacheUpdateEffect } from './CodeMirrorExtensions';
import { CreateLivePreviewSuppressor } from './LivePreviewSuppressor';
import {
	SanitiseHtml,
	StripArchiveResidualResources,
	StripResourceHintLinks,
	StripStylesheetLinks,
} from './HTMLSanitiser';
import { ContentHash, WithTimeout } from './Utils';
import { ParseWebArchive } from './WebArchiveParser';
import { ParseMHTML } from './MHTMLParser';
import {
	StartStage,
	EndStage,
	RecordStage,
	LogPerformanceSummary,
} from './Performance';
import { PersistentCache, type PersistentCacheRecord } from './PersistentCache';

interface MarkdownViewWithCm extends MarkdownView {
	editor: MarkdownView['editor'] & {
		cm?: EditorView;
	};
}

/**
 * All data associated with a cached HTML file, including parsed content and rendering state.
 */
interface CacheEntry {
	Html: string;
	Hash: string;
	Mtime: number;
	BlobUrl?: string;
	LastAccessed: number;
	ByteSize: number;
}

export type { CacheEntry };

export default class HtmlViewerPlugin extends Plugin {
	Cache: Map<string, CacheEntry> = new Map();
	PendingLoads: Map<string, Promise<void>> = new Map();
	PendingPersistentLoads: Map<string, Promise<CacheEntry | null>> = new Map();
	DebounceTimers: Map<string, number> = new Map();
	LoggedRenderedEmbeds: Set<string> = new Set();
	PersistentCache = new PersistentCache();

	private readonly LogPrefix = '[Embeds-Plus]:';

	async onload() {
		this.registerView(
			VIEW_TYPE_HTML,
			(Leaf: WorkspaceLeaf) => new HTMLFileView(Leaf, this)
		);
		this.registerExtensions(['html', 'mhtml', 'mht', 'webarchive'], VIEW_TYPE_HTML);

		this.registerEditorExtension(CreateLivePreviewSuppressor(this));

		const PostProcessor = this.registerMarkdownPostProcessor((Element, Context) => {
			const EmbedElements = Element.querySelectorAll('.internal-embed');
			for (const EmbedElement of Array.from(EmbedElements)) {
				this.ProcessReadingViewEmbed(EmbedElement as HTMLElement, Context);
			}
		});

		// Run after Obsidian's native processors so the embed DOM already exists.
		PostProcessor.sortOrder = 100;

		this.registerEvent(
			this.app.vault.on('modify', (File) => {
				if (!(File instanceof TFile)) {
					return;
				}

				if (!IsHtmlEmbedExtension(File.extension)) {
					return;
				}

				this.DebouncedLoadAndCache(File);
				this.InvalidatePersistentCache(File.path);
			})
		);

		void this.PersistentCache.Prune();
	}

	FormatEmbedLabel(FilePath: string): string {
		const FileName = FilePath.split('/').pop() ?? FilePath;
		return `"${FileName}"`;
	}

	LogEmbedRendered(FilePath: string, DurationMs: number): void {
		console.debug(
			`${this.LogPrefix} ${this.FormatEmbedLabel(FilePath)} embed rendered successfully in ${DurationMs.toFixed(2)}ms.`
		);
	}

	LogPluginError(Context: string, ErrorValue: unknown, FilePath?: string): void {
		const ErrorMessage =
			ErrorValue instanceof Error ? ErrorValue.message : String(ErrorValue);
		const FileSegment = FilePath ? ` ${this.FormatEmbedLabel(FilePath)}` : '';
		console.error(
			`${this.LogPrefix} Failed to ${Context}${FileSegment}: ${ErrorMessage}.`
		);
	}

	ShouldLogEmbedRendered(FilePath: string): boolean {
		return !this.LoggedRenderedEmbeds.has(FilePath);
	}

	MarkEmbedRenderedLogged(FilePath: string): void {
		this.LoggedRenderedEmbeds.add(FilePath);
	}

	ResetEmbedRenderedLogged(FilePath: string): void {
		this.LoggedRenderedEmbeds.delete(FilePath);
	}

	ResolveHtmlFile(FilePath: string, SourcePath: string): TFile | null {
		const ParsedLink = ParseLinktext(FilePath);
		const Extension = ParsedLink.path.split('.').pop() ?? '';
		if (!IsHtmlEmbedExtension(Extension)) {
			return null;
		}

		const File = this.app.metadataCache.getFirstLinkpathDest(
			ParsedLink.path,
			SourcePath
		);
		if (!(File instanceof TFile)) {
			return null;
		}

		return File;
	}

	/**
	 * Returns the cache entry for a file, building it from source if not already cached.
	 */
	async GetCachedContent(File: TFile): Promise<CacheEntry> {
		const ExistingEntry = this.Cache.get(File.path);
		if (ExistingEntry && ExistingEntry.Mtime === File.stat.mtime) {
			const UpdatedEntry = this.RefreshCachedResourceHints(File.path, ExistingEntry);
			UpdatedEntry.LastAccessed = Date.now();
			void this.PersistCacheEntry(File.path, UpdatedEntry);
			return UpdatedEntry;
		}

		const PersistentEntry = await this.LoadPersistentCacheEntry(File);
		if (PersistentEntry) {
			const UpdatedEntry = this.RefreshCachedResourceHints(File.path, PersistentEntry);
			this.Cache.set(File.path, UpdatedEntry);
			return UpdatedEntry;
		}

		await this.LoadAndCacheHtml(File);
		const Entry = this.Cache.get(File.path);
		if (!Entry) {
			throw new Error(`Failed to cache HTML content for ${File.path}`);
		}

		return Entry;
	}

	/**
	 * Gets cached HTML content as a string for backward compatibility.
	 */
	async GetCachedHtmlContent(File: TFile): Promise<string> {
		const Entry = await this.GetCachedContent(File);
		return Entry.Html;
	}

	/**
	 * Returns the blob URL for a cached file, creating and storing it on first access.
	 */
	GetOrCreateBlobUrl(FilePath: string): string | null {
		const Entry = this.Cache.get(FilePath);
		if (!Entry) {
			return null;
		}

		if (Entry.BlobUrl) {
			return Entry.BlobUrl;
		}

		try {
			const BlobContent = new Blob([Entry.Html], { type: 'text/html' });
			Entry.BlobUrl = URL.createObjectURL(BlobContent);
			return Entry.BlobUrl;
		} catch {
			return null;
		}
	}

	/**
	 * Revokes the blob URL for a file, freeing the associated memory.
	 */
	RevokeBlobUrl(FilePath: string): void {
		const Entry = this.Cache.get(FilePath);
		if (Entry?.BlobUrl) {
			URL.revokeObjectURL(Entry.BlobUrl);
			Entry.BlobUrl = undefined;
		}
	}

	/**
	 * Exposes the content hash so callers can check for changes without re-reading the file.
	 */
	GetContentHash(FilePath: string): string | undefined {
		return this.Cache.get(FilePath)?.Hash;
	}

	private RefreshCachedResourceHints(FilePath: string, Entry: CacheEntry): CacheEntry {
		const IsArchiveLikePath = /\.(webarchive|mhtml|mht)$/i.test(FilePath);
		const UpdatedHtml = IsArchiveLikePath
			? StripArchiveResidualResources(
					StripStylesheetLinks(StripResourceHintLinks(Entry.Html))
				)
			: StripResourceHintLinks(Entry.Html);
		if (UpdatedHtml === Entry.Html) {
			return Entry;
		}

		if (Entry.BlobUrl) {
			URL.revokeObjectURL(Entry.BlobUrl);
			Entry.BlobUrl = undefined;
		}

		Entry.Html = UpdatedHtml;
		Entry.Hash = ContentHash(UpdatedHtml);
		Entry.ByteSize = new Blob([UpdatedHtml]).size;
		Entry.LastAccessed = Date.now();
		this.ResetEmbedRenderedLogged(FilePath);
		void this.PersistCacheEntry(FilePath, Entry);

		return Entry;
	}

	private ProcessReadingViewEmbed(
		EmbedElement: HTMLElement,
		Context: MarkdownPostProcessorContext
	): void {
		if (EmbedElement.hasClass('html-embed')) {
			return;
		}

		let FilePath =
			EmbedElement.getAttribute('src') || EmbedElement.getAttribute('alt');
		if (!FilePath) {
			const LinkElement = EmbedElement.querySelector('a.internal-link');
			if (LinkElement) {
				FilePath =
					LinkElement.getAttribute('data-href') ||
					LinkElement.getAttribute('href');
			}
		}

		if (!FilePath) {
			return;
		}

		const File = this.ResolveHtmlFile(FilePath, Context.sourcePath);
		if (!File) {
			return;
		}

		const Renderer = new HTMLEmbedRenderer(EmbedElement, File, this);
		Context.addChild(Renderer);
	}

	private DebouncedLoadAndCache(File: TFile): void {
		this.InvalidateMemoryCache(File.path);
		this.InvalidatePersistentCache(File.path);

		const ExistingTimer = this.DebounceTimers.get(File.path);
		if (ExistingTimer !== undefined) {
			window.clearTimeout(ExistingTimer);
		}

		const Timer = window.setTimeout(() => {
			void this.LoadAndCacheHtml(File).catch((ErrorValue) => {
				this.LogPluginError('refresh cache', ErrorValue, File.path);
			});
			this.DebounceTimers.delete(File.path);
		}, FILE_MODIFY_DEBOUNCE_MS);

		this.DebounceTimers.set(File.path, Timer);
	}

	private async ReadHtmlFileContent(File: TFile): Promise<string> {
		StartStage(File.path, 'readSource');
		const Ext = File.extension.toLowerCase();

		if (Ext === 'webarchive') {
			const BinaryContent = await this.app.vault.readBinary(File);
			RecordStage(File.path, 'readSource', EndStage(File.path, 'readSource'));

			StartStage(File.path, 'parseWebArchive');
			const ParsedHtml = ParseWebArchive(BinaryContent);
			RecordStage(File.path, 'parseWebArchive', EndStage(File.path, 'parseWebArchive'));
			return ParsedHtml;
		}

		const Content = await this.app.vault.read(File);
		RecordStage(File.path, 'readSource', EndStage(File.path, 'readSource'));

		if (Ext === 'mhtml' || Ext === 'mht') {
			StartStage(File.path, 'parseMHTML');
			const ParsedHtml = ParseMHTML(Content);
			RecordStage(File.path, 'parseMHTML', EndStage(File.path, 'parseMHTML'));
			return ParsedHtml;
		}

		return Content;
	}

	async LoadAndCacheHtml(File: TFile): Promise<void> {
		const ExistingLoad = this.PendingLoads.get(File.path);
		if (ExistingLoad) {
			await ExistingLoad;
			return;
		}

		const LoadPromise = (async () => {
			const RawContent = await WithTimeout(
				this.ReadHtmlFileContent(File),
				HTML_LOAD_FAILURE_TIMEOUT_MS,
				`Timed out loading source content after ${HTML_LOAD_FAILURE_TIMEOUT_MS / 1000} seconds`
			);

			StartStage(File.path, 'sanitise');
			const SanitisedContent = await WithTimeout(
				SanitiseHtml(RawContent),
				HTML_LOAD_FAILURE_TIMEOUT_MS,
				`Timed out sanitising content after ${HTML_LOAD_FAILURE_TIMEOUT_MS / 1000} seconds`
			);
			RecordStage(File.path, 'sanitise', EndStage(File.path, 'sanitise'));

			const IsArchiveLikeFile = /\.(webarchive|mhtml|mht)$/i.test(File.path);
			const FinalContent = IsArchiveLikeFile
				? StripArchiveResidualResources(SanitisedContent)
				: SanitisedContent;

			const PreviousEntry = this.Cache.get(File.path);
			const NextHash = ContentHash(FinalContent);

			if (PreviousEntry?.BlobUrl && PreviousEntry.Hash !== NextHash) {
				this.RevokeBlobUrl(File.path);
			}

			const CacheEntryValue: CacheEntry = {
				Html: FinalContent,
				Hash: NextHash,
				Mtime: File.stat.mtime,
				LastAccessed: Date.now(),
				ByteSize: new Blob([FinalContent]).size,
			};

			this.Cache.set(File.path, CacheEntryValue);
			void this.PersistCacheEntry(File.path, CacheEntryValue);

			if (PreviousEntry === undefined || PreviousEntry.Hash !== NextHash) {
				this.ResetEmbedRenderedLogged(File.path);
			}

			LogPerformanceSummary(File.path, 'cold load complete');
			this.DispatchTargetedCacheUpdate(File.path);
		})();

		this.PendingLoads.set(File.path, LoadPromise);
		try {
			await LoadPromise;
		} finally {
			this.PendingLoads.delete(File.path);
		}
	}

	private DocumentContainsEmbed(DocumentText: string, FilePath: string): boolean {
		const FileName = FilePath.split('/').pop() ?? FilePath;

		return (
			DocumentText.includes(`![[${FileName}]]`) ||
			DocumentText.includes(`![[${FileName}|`) ||
			DocumentText.includes(`![[${FilePath}]]`) ||
			DocumentText.includes(`![[${FilePath}|`)
		);
	}

	private DispatchTargetedCacheUpdate(FilePath: string): void {
		this.app.workspace.iterateAllLeaves((Leaf) => {
			if (Leaf.view.getViewType() !== 'markdown') {
				return;
			}

			const MarkdownLeafView = Leaf.view as MarkdownViewWithCm;
			const CmEditor = MarkdownLeafView.editor.cm;
			if (!CmEditor) {
				return;
			}

			const DocumentText = CmEditor.state.doc.toString();
			if (!this.DocumentContainsEmbed(DocumentText, FilePath)) {
				return;
			}

			CmEditor.dispatch({
				effects: HtmlCacheUpdateEffect.of(FilePath),
			});
		});
	}

	private async LoadPersistentCacheEntry(File: TFile): Promise<CacheEntry | null> {
		const CacheKey = `${File.path}:${File.stat.mtime}:v${RENDERED_HTML_CACHE_VERSION}`;
		const ExistingLoad = this.PendingPersistentLoads.get(CacheKey);
		if (ExistingLoad) {
			return ExistingLoad;
		}

		const LoadPromise = this.LoadPersistentCacheEntryInternal(File);
		this.PendingPersistentLoads.set(CacheKey, LoadPromise);

		try {
			return await LoadPromise;
		} finally {
			this.PendingPersistentLoads.delete(CacheKey);
		}
	}

	private async LoadPersistentCacheEntryInternal(File: TFile): Promise<CacheEntry | null> {
		StartStage(File.path, 'persistentCacheRead');
		const PersistentEntry = await this.PersistentCache.Get(
			File.path,
			File.stat.mtime,
			RENDERED_HTML_CACHE_VERSION
		);
		RecordStage(
			File.path,
			'persistentCacheRead',
			EndStage(File.path, 'persistentCacheRead')
		);

		if (!PersistentEntry) {
			return null;
		}

		const CacheEntryValue: CacheEntry = {
			Html: PersistentEntry.Html,
			Hash: PersistentEntry.Hash,
			Mtime: PersistentEntry.Mtime,
			LastAccessed: Date.now(),
			ByteSize: PersistentEntry.ByteSize,
		};

		void this.PersistCacheEntry(File.path, CacheEntryValue);

		return CacheEntryValue;
	}

	private async PersistCacheEntry(FilePath: string, Entry: CacheEntry): Promise<void> {
		const Record: PersistentCacheRecord = {
			Path: FilePath,
			Mtime: Entry.Mtime,
			Version: RENDERED_HTML_CACHE_VERSION,
			Html: Entry.Html,
			Hash: Entry.Hash,
			LastAccessed: Entry.LastAccessed,
			ByteSize: Entry.ByteSize,
		};

		await this.PersistentCache.Set(Record);
	}

	private InvalidateMemoryCache(FilePath: string): void {
		this.RevokeBlobUrl(FilePath);
		this.Cache.delete(FilePath);
		this.ResetEmbedRenderedLogged(FilePath);
	}

	private InvalidatePersistentCache(FilePath: string): void {
		void this.PersistentCache.DeletePath(FilePath);
	}

	onunload() {
		this.DebounceTimers.forEach((Timer) => window.clearTimeout(Timer));

		// Revoke all blob URLs to prevent memory leaks.
		for (const Entry of this.Cache.values()) {
			if (Entry.BlobUrl) {
				URL.revokeObjectURL(Entry.BlobUrl);
			}
		}

		this.Cache.clear();
		this.PendingLoads.clear();
		this.PendingPersistentLoads.clear();
		this.DebounceTimers.clear();
		this.LoggedRenderedEmbeds.clear();
	}
}
