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
import {
	CreateHtmlEmbedStateField,
	HtmlCacheUpdateEffect,
} from './CodeMirrorExtensions';
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

	async onload() {
		console.log('Loading HTML Viewer Plugin');

		this.registerView(VIEW_TYPE_HTML, (Leaf: WorkspaceLeaf) => new HTMLFileView(Leaf, this));
		this.registerExtensions(['html', 'mhtml', 'webarchive'], VIEW_TYPE_HTML);

		this.registerEditorExtension(CreateHtmlEmbedStateField(this));
		this.registerEditorExtension(CreateLivePreviewSuppressor(this));

		const PostProcessor = this.registerMarkdownPostProcessor((Element, Context) => {
			const EmbedElements = Element.querySelectorAll('.internal-embed');
			for (const EmbedElement of Array.from(EmbedElements)) {
				this.ProcessReadingViewEmbed(EmbedElement as HTMLElement, Context);
			}

			const LinkElements = Element.querySelectorAll('a.internal-link');
			for (const LinkElement of Array.from(LinkElements)) {
				this.ProcessReadingViewLink(LinkElement as HTMLAnchorElement, Context);
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

		console.log('HTML Viewer Plugin loaded');
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

	private ProcessReadingViewLink(
		LinkElement: HTMLAnchorElement,
		Context: MarkdownPostProcessorContext
	): void {
		const FilePath = LinkElement.getAttribute('data-href') || LinkElement.getAttribute('href');
		if (!FilePath) {
			return;
		}

		const File = this.ResolveHtmlFile(FilePath, Context.sourcePath);
		if (!File) {
			return;
		}

		const EmbedWrapper = document.createElement('div');
		LinkElement.replaceWith(EmbedWrapper);

		const Renderer = new HTMLEmbedRenderer(EmbedWrapper, File, this);
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
			console.debug('[HTML-Embed] Using cached parsed WebArchive for', File.path);
			return CachedWebArchive.Html;
		}

		console.debug('[HTML-Embed] Parsing WebArchive file:', File.path);
		const ParseStart = performance.now();
		const BinaryContent = await this.app.vault.readBinary(File);
		const ParsedHtml = ParseWebArchive(BinaryContent);
		const ParseDuration = performance.now() - ParseStart;
		console.debug(`[HTML-Embed] Parsed WebArchive in ${ParseDuration.toFixed(2)}ms`);

		this.WebArchiveParsedCache.set(File.path, {
			Mtime: File.stat.mtime,
			Html: ParsedHtml,
		});

		return ParsedHtml;
	}

	async LoadAndCacheHtml(File: TFile): Promise<void> {
		const ExistingLoad = this.PendingLoads.get(File.path);
		if (ExistingLoad) {
			console.debug('[HTML-Embed] Skipping duplicate load for', File.path);
			await ExistingLoad;
			return;
		}

		console.debug('[HTML-Embed] Loading HTML file into cache:', File.path);
		const LoadPromise = (async () => {
			try {
				const RawContent = await this.ReadHtmlFileContent(File);
				const SanitisedContent = SanitiseHtml(RawContent);

				this.HtmlCache.set(File.path, SanitisedContent);
				this.HtmlHashCache.set(File.path, ContentHash(SanitisedContent));
				console.debug('[HTML-Embed] Cached HTML file', File.path, 'length:', SanitisedContent.length);

				this.DispatchTargetedCacheUpdate(File.path);
			} catch (ErrorValue) {
				console.error('Error loading HTML file:', ErrorValue);
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
			DocumentText.includes(`[[${FileName}]]`) ||
			DocumentText.includes(`[[${FileName}|`) ||
			DocumentText.includes(`![[${FileName}]]`) ||
			DocumentText.includes(`![[${FileName}|`) ||
			DocumentText.includes(`[[${FilePath}]]`) ||
			DocumentText.includes(`[[${FilePath}|`) ||
			DocumentText.includes(`![[${FilePath}]]`) ||
			DocumentText.includes(`![[${FilePath}|`)
		);
	}

	private DispatchTargetedCacheUpdate(FilePath: string): void {
		let UpdateCount = 0;

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
			UpdateCount++;
			console.debug('[HTML-Embed] Dispatched cache update to editor for', FilePath);
		});

		if (UpdateCount === 0) {
			console.debug('[HTML-Embed] No editors contain embed for', FilePath, '- no updates dispatched');
			return;
		}

		console.debug(`[HTML-Embed] Dispatched cache update to ${UpdateCount} editor(s) for`, FilePath);
	}

	onunload() {
		console.log('HTML Viewer Plugin unloaded');

		this.DebounceTimers.forEach((Timer) => window.clearTimeout(Timer));
		this.HtmlCache.clear();
		this.HtmlHashCache.clear();
		this.PendingLoads.clear();
		this.WebArchiveParsedCache.clear();
		this.DebounceTimers.clear();
	}
}
