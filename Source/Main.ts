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
	VIEW_TYPE_HTML,
	IsHtmlEmbedExtension,
} from './Constants';
import { HTMLEmbedRenderer } from './HTMLEmbedRenderer';
import { HTMLFileView } from './HTMLFileView';
import { HtmlCacheUpdateEffect } from './CodeMirrorExtensions';
import { CreateLivePreviewSuppressor } from './LivePreviewSuppressor';
import { SanitiseHtml } from './HTMLSanitiser';
import { ContentHash } from './Utils';
import { ParseWebArchive } from './WebArchiveParser';

interface MarkdownViewWithCm extends MarkdownView {
	editor: MarkdownView['editor'] & {
		cm?: EditorView;
	};
}

export default class HtmlViewerPlugin extends Plugin {
	HtmlCache: Map<string, string> = new Map();
	HtmlHashCache: Map<string, string> = new Map();
	PendingLoads: Map<string, Promise<void>> = new Map();
	WebArchiveParsedCache: Map<string, { Mtime: number; Html: string }> = new Map();
	DebounceTimers: Map<string, number> = new Map();
	LoggedRenderedEmbeds: Set<string> = new Set();

	private readonly LogPrefix = '[Embeds-Plus]:';

	async onload() {
		this.registerView(VIEW_TYPE_HTML, (Leaf: WorkspaceLeaf) => new HTMLFileView(Leaf, this));
		this.registerExtensions(['html', 'mhtml', 'webarchive'], VIEW_TYPE_HTML);

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
			})
		);

	}

	FormatEmbedLabel(FilePath: string): string {
		const FileName = FilePath.split('/').pop() ?? FilePath;
		return `"${FileName}"`;
	}

	LogEmbedRendered(FilePath: string, DurationMs: number): void {
		console.log(
			`${this.LogPrefix} ${this.FormatEmbedLabel(FilePath)} embed rendered successfully in ${DurationMs.toFixed(2)}ms.`
		);
	}

	LogPluginError(Context: string, ErrorValue: unknown, FilePath?: string): void {
		const ErrorMessage = ErrorValue instanceof Error ? ErrorValue.message : String(ErrorValue);
		const FileSegment = FilePath ? ` ${this.FormatEmbedLabel(FilePath)}` : '';
		console.error(`${this.LogPrefix} Failed to ${Context}${FileSegment}: ${ErrorMessage}.`);
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

		const File = this.app.metadataCache.getFirstLinkpathDest(ParsedLink.path, SourcePath);
		if (!(File instanceof TFile)) {
			return null;
		}

		return File;
	}

	async GetCachedHtmlContent(File: TFile): Promise<string> {
		const CachedContent = this.HtmlCache.get(File.path);
		if (CachedContent !== undefined) {
			return CachedContent;
		}

		await this.LoadAndCacheHtml(File);
		return this.HtmlCache.get(File.path) ?? '';
	}

	private ProcessReadingViewEmbed(
		EmbedElement: HTMLElement,
		Context: MarkdownPostProcessorContext
	): void {
		if (EmbedElement.hasClass('html-embed')) {
			return;
		}

		let FilePath = EmbedElement.getAttribute('src') || EmbedElement.getAttribute('alt');
		if (!FilePath) {
			const LinkElement = EmbedElement.querySelector('a.internal-link');
			if (LinkElement) {
				FilePath = LinkElement.getAttribute('data-href') || LinkElement.getAttribute('href');
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
		const ExistingTimer = this.DebounceTimers.get(File.path);
		if (ExistingTimer !== undefined) {
			window.clearTimeout(ExistingTimer);
		}

		const Timer = window.setTimeout(() => {
			void this.LoadAndCacheHtml(File);
			this.DebounceTimers.delete(File.path);
		}, FILE_MODIFY_DEBOUNCE_MS);

		this.DebounceTimers.set(File.path, Timer);
	}

	private async ReadHtmlFileContent(File: TFile): Promise<string> {
		if (File.extension.toLowerCase() !== 'webarchive') {
			return this.app.vault.read(File);
		}

		const CachedWebArchive = this.WebArchiveParsedCache.get(File.path);
		if (CachedWebArchive && CachedWebArchive.Mtime === File.stat.mtime) {
			return CachedWebArchive.Html;
		}

		const BinaryContent = await this.app.vault.readBinary(File);
		const ParsedHtml = ParseWebArchive(BinaryContent);

		this.WebArchiveParsedCache.set(File.path, {
			Mtime: File.stat.mtime,
			Html: ParsedHtml,
		});

		return ParsedHtml;
	}

	async LoadAndCacheHtml(File: TFile): Promise<void> {
		const ExistingLoad = this.PendingLoads.get(File.path);
		if (ExistingLoad) {
			await ExistingLoad;
			return;
		}

		const LoadPromise = (async () => {
			try {
				const RawContent = await this.ReadHtmlFileContent(File);
				const SanitisedContent = await SanitiseHtml(RawContent);
				const PreviousHash = this.HtmlHashCache.get(File.path);
				const NextHash = ContentHash(SanitisedContent);

				this.HtmlCache.set(File.path, SanitisedContent);
				this.HtmlHashCache.set(File.path, NextHash);

				if (PreviousHash === undefined || PreviousHash !== NextHash) {
					this.ResetEmbedRenderedLogged(File.path);
				}

				this.DispatchTargetedCacheUpdate(File.path);
			} catch (ErrorValue) {
				this.LogPluginError('load', ErrorValue, File.path);
				this.HtmlCache.set(File.path, '');
				this.HtmlHashCache.set(File.path, ContentHash(''));
			}
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

	onunload() {
		this.DebounceTimers.forEach((Timer) => window.clearTimeout(Timer));
		this.HtmlCache.clear();
		this.HtmlHashCache.clear();
		this.PendingLoads.clear();
		this.WebArchiveParsedCache.clear();
		this.DebounceTimers.clear();
		this.LoggedRenderedEmbeds.clear();
	}
}
