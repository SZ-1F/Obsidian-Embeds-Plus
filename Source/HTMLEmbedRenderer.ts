import { MarkdownRenderChild, TFile } from 'obsidian';
import {
	HTML_EMBED_HEIGHT_PX,
	HTML_EMBED_IFRAME_SANDBOX,
} from './Constants';
import type HtmlViewerPlugin from './Main';

export class HTMLEmbedRenderer extends MarkdownRenderChild {
	private readonly File: TFile;
	private readonly Plugin: HtmlViewerPlugin;

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

		const Iframe = IframeContainer.createEl('iframe');
		Iframe.style.width = '100%';
		Iframe.style.height = `${HTML_EMBED_HEIGHT_PX}px`;
		Iframe.style.border = 'none';
		Iframe.style.display = 'block';
		Iframe.setAttribute('sandbox', HTML_EMBED_IFRAME_SANDBOX);
		Iframe.srcdoc = HtmlContent;

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

	private RenderError(Message: string): void {
		this.containerEl.empty();
		const ErrorElement = this.containerEl.createDiv({ cls: 'html-embed-error' });
		ErrorElement.textContent = Message;
	}
}
