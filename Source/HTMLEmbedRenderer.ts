import { MarkdownRenderChild, TFile } from 'obsidian';
import {
	HTML_EMBED_HEIGHT_PX,
	HTML_EMBED_IFRAME_SANDBOX,
} from './Constants';
import type HtmlViewerPlugin from './Main';
import { ScheduleNonBlockingRender } from './Utils';

export class HTMLEmbedRenderer extends MarkdownRenderChild {
	private readonly File: TFile;
	private readonly Plugin: HtmlViewerPlugin;
	private BlobUrl: string | null = null;

	constructor(ContainerElement: HTMLElement, File: TFile, Plugin: HtmlViewerPlugin) {
		super(ContainerElement);
		this.File = File;
		this.Plugin = Plugin;
	}

	async onload() {
		try {
			const HtmlContent = await this.Plugin.GetCachedHtmlContent(this.File);
			this.RenderEmbed(HtmlContent);
		} catch (ErrorValue) {
			console.error('Error rendering HTML embed:', ErrorValue);
			this.RenderError(
				`Error rendering HTML embed: ${ErrorValue instanceof Error ? ErrorValue.message : String(ErrorValue)}`
			);
		}
	}

	private RenderEmbed(HtmlContent: string): void {
		this.containerEl.empty();
		this.containerEl.addClass('internal-embed', 'is-loaded', 'html-embed');

		const EmbedContainer = this.containerEl.createDiv({ cls: 'markdown-embed' });
		const EmbedContent = EmbedContainer.createDiv({ cls: 'markdown-embed-content' });
		const PreviewView = EmbedContent.createDiv({ cls: 'markdown-preview-view' });
		const Sizer = PreviewView.createDiv({
			cls: 'markdown-preview-sizer markdown-preview-section',
		});

		const IframeContainer = Sizer.createDiv({ cls: 'html-embed-iframe-container' });
		IframeContainer.style.height = `${HTML_EMBED_HEIGHT_PX}px`;
		IframeContainer.style.position = 'relative';

		const Iframe = IframeContainer.createEl('iframe');
		Iframe.style.width = '100%';
		Iframe.style.height = `${HTML_EMBED_HEIGHT_PX}px`;
		Iframe.style.border = 'none';
		Iframe.style.display = 'block';
		Iframe.style.overflow = 'auto';
		Iframe.setAttribute('sandbox', HTML_EMBED_IFRAME_SANDBOX);

		this.RenderIframeAsync(Iframe, HtmlContent);

		const OpenLink = EmbedContainer.createEl('a', {
			cls: 'markdown-embed-link',
			href: this.File.path,
		});
		OpenLink.setAttribute('aria-label', 'Open link');
		OpenLink.addEventListener('click', (Event) => {
			Event.preventDefault();
			this.Plugin.app.workspace.openLinkText(this.File.path, '', false);
		});
	}

	private RenderIframeAsync(Iframe: HTMLIFrameElement, HtmlContent: string): void {
		ScheduleNonBlockingRender(() => {
			try {
				console.debug('[HtmlEmbedRenderer] Rendering iframe content for', this.File.path);
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
						console.debug(
							`[HtmlEmbedRenderer] Rendered iframe in ${RenderDuration.toFixed(2)}ms for`,
							this.File.path
						);
					},
					{ once: true }
				);
			} catch (ErrorValue) {
				console.error('[HtmlEmbedRenderer] Async rendering failed, using sync fallback:', ErrorValue);
				this.FallbackSyncRender(Iframe, HtmlContent);
			}
		});
	}

	private FallbackSyncRender(Iframe: HTMLIFrameElement, HtmlContent: string): void {
		const IframeDocument = Iframe.contentDocument;
		if (!IframeDocument) {
			this.RenderError('Error rendering HTML embed: Unable to access iframe document.');
			return;
		}

		console.debug('[HtmlEmbedRenderer] Using sync fallback render for', this.File.path);
		IframeDocument.open();
		IframeDocument.write(HtmlContent);
		IframeDocument.close();
	}

	private RenderError(Message: string): void {
		this.containerEl.empty();
		const ErrorElement = this.containerEl.createDiv({ cls: 'html-embed-error' });
		ErrorElement.style.padding = '12px';
		ErrorElement.style.background = 'var(--background-secondary)';
		ErrorElement.style.color = 'var(--text-error)';
		ErrorElement.style.borderRadius = '4px';
		ErrorElement.style.fontSize = '12px';
		ErrorElement.textContent = Message;
	}

	onunload() {
		if (this.BlobUrl) {
			URL.revokeObjectURL(this.BlobUrl);
			this.BlobUrl = null;
		}
	}
}
