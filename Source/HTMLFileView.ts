import { FileView, TFile, WorkspaceLeaf } from 'obsidian';
import {
	HTML_EMBED_IFRAME_SANDBOX,
	VIEW_TYPE_HTML,
	IsHtmlViewExtension,
} from './Constants';
import type HtmlViewerPlugin from './Main';
import { ScheduleNonBlockingRender } from './Utils';

export class HTMLFileView extends FileView {
	private readonly Plugin: HtmlViewerPlugin;
	private BlobUrl: string | null = null;

	constructor(Leaf: WorkspaceLeaf, Plugin: HtmlViewerPlugin) {
		super(Leaf);
		this.Plugin = Plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_HTML;
	}

	getDisplayText(): string {
		return this.file?.basename ?? 'HTML View';
	}

	getIcon(): string {
		return 'file-code';
	}

	canAcceptExtension(Extension: string): boolean {
		return IsHtmlViewExtension(Extension);
	}

	async onLoadFile(File: TFile) {
		try {
			const HtmlContent = await this.Plugin.GetCachedHtmlContent(File);
			this.RenderHtml(HtmlContent);
		} catch (ErrorValue) {
			this.contentEl.innerHTML = `<div style="padding: 20px; color: red;">Error loading file: ${ErrorValue instanceof Error ? ErrorValue.message : String(ErrorValue)}</div>`;
		}
	}

	private RenderHtml(HtmlContent: string): void {
		this.contentEl.empty();

		const Iframe = this.contentEl.createEl('iframe');
		Iframe.style.width = '100%';
		Iframe.style.height = '100%';
		Iframe.style.border = 'none';
		Iframe.style.display = 'block';
		Iframe.setAttribute('sandbox', HTML_EMBED_IFRAME_SANDBOX);

		this.RenderIframeAsync(Iframe, HtmlContent);
	}

	private RenderIframeAsync(Iframe: HTMLIFrameElement, HtmlContent: string): void {
		ScheduleNonBlockingRender(() => {
			try {
				console.debug('[HtmlFileView] Rendering iframe content');
				const RenderStart = performance.now();

				if (this.BlobUrl) {
					URL.revokeObjectURL(this.BlobUrl);
				}

				const BlobContent = new Blob([HtmlContent], { type: 'text/html' });
				this.BlobUrl = URL.createObjectURL(BlobContent);
				Iframe.src = this.BlobUrl;

				Iframe.addEventListener(
					'load',
					() => {
						const RenderDuration = performance.now() - RenderStart;
						console.debug(`[HtmlFileView] Rendered iframe in ${RenderDuration.toFixed(2)}ms`);
					},
					{ once: true }
				);
			} catch (ErrorValue) {
				console.error('[HtmlFileView] Async rendering failed, using sync fallback:', ErrorValue);
				this.FallbackSyncRender(Iframe, HtmlContent);
			}
		});
	}

	private FallbackSyncRender(Iframe: HTMLIFrameElement, HtmlContent: string): void {
		const IframeDocument = Iframe.contentDocument;
		if (!IframeDocument) {
			this.contentEl.innerHTML =
				'<div style="padding: 20px; color: red;">Error: Unable to access iframe document.</div>';
			return;
		}

		console.debug('[HtmlFileView] Using sync fallback render');
		IframeDocument.open();
		IframeDocument.write(HtmlContent);
		IframeDocument.close();
	}

	async onUnloadFile(_File: TFile) {
		if (this.BlobUrl) {
			URL.revokeObjectURL(this.BlobUrl);
			this.BlobUrl = null;
		}
	}
}
