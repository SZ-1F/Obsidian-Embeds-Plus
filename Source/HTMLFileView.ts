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
			this.Plugin.LogPluginError('load file view', ErrorValue, File.path);
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
				if (this.BlobUrl) {
					URL.revokeObjectURL(this.BlobUrl);
				}

				const BlobContent = new Blob([HtmlContent], { type: 'text/html' });
				this.BlobUrl = URL.createObjectURL(BlobContent);
				Iframe.src = this.BlobUrl;
			} catch (ErrorValue) {
				try {
					this.FallbackSyncRender(Iframe, HtmlContent);
				} catch (FallbackError) {
					this.Plugin.LogPluginError('render file view', FallbackError, this.file?.path);
				}
			}
		});
	}

	private FallbackSyncRender(Iframe: HTMLIFrameElement, HtmlContent: string): void {
		const IframeDocument = Iframe.contentDocument;
		if (!IframeDocument) {
			this.Plugin.LogPluginError(
				'render file view',
				new Error('Unable to access iframe document'),
				this.file?.path
			);
			this.contentEl.innerHTML =
				'<div style="padding: 20px; color: red;">Error: Unable to access iframe document.</div>';
			return;
		}

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
