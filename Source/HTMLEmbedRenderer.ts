import { MarkdownRenderChild, TFile } from 'obsidian';
import {
	HTML_EMBED_HEIGHT_PX,
	HTML_EMBED_IFRAME_SANDBOX,
} from './Constants';
import type HtmlViewerPlugin from './Main';
import { ScheduleNonBlockingRender } from './Utils';

const OpenIconSvg =
	'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>';
const NativeLivePreviewEmbedClass = 'html-embed-native-live-preview';

type HTMLEmbedRenderMode = 'standard' | 'native-live-preview';

export class HTMLEmbedRenderer extends MarkdownRenderChild {
	private BlobUrl: string | null = null;
	private IsDisposed = false;
	private RenderStartMs = 0;

	constructor(
		ContainerElement: HTMLElement,
		private readonly File: TFile,
		private readonly Plugin: HtmlViewerPlugin,
		private readonly RenderMode: HTMLEmbedRenderMode = 'standard'
	) {
		super(ContainerElement);
	}

	async onload() {
		this.IsDisposed = false;
		this.RenderStartMs = performance.now();

		try {
			if (!this.Plugin.HtmlCache.has(this.File.path)) {
				this.RenderEmbed('', true);
			}

			const HtmlContent = await this.Plugin.GetCachedHtmlContent(this.File);
			if (this.IsDisposed || !this.containerEl.isConnected) {
				return;
			}

			this.RenderEmbed(HtmlContent);
		} catch (ErrorValue) {
			if (this.IsDisposed) {
				return;
			}

			this.Plugin.LogPluginError('render embed', ErrorValue, this.File.path);
			this.RenderError(
				`Error rendering HTML embed: ${ErrorValue instanceof Error ? ErrorValue.message : String(ErrorValue)}`
			);
		}
	}

	private RenderEmbed(HtmlContent: string, IsLoading = false): void {
		this.containerEl.empty();
		this.containerEl.addClass('internal-embed', 'is-loaded', 'html-embed');
		this.containerEl.classList.toggle('is-loading', IsLoading);
		this.containerEl.classList.toggle(
			NativeLivePreviewEmbedClass,
			this.RenderMode === 'native-live-preview'
		);

		if (this.RenderMode === 'native-live-preview') {
			this.RenderNativeLivePreviewEmbed(HtmlContent, IsLoading);
			return;
		}

		this.RenderStandardEmbed(HtmlContent, IsLoading);
	}

	private RenderStandardEmbed(HtmlContent: string, IsLoading: boolean): void {
		const EmbedContainer = this.containerEl.createDiv({ cls: 'markdown-embed' });
		const Header = EmbedContainer.createDiv({ cls: 'html-embed-header' });
		const HeaderLeft = Header.createDiv({ cls: 'html-embed-header-left' });

		const IconElement = HeaderLeft.createDiv({ cls: 'html-embed-icon' });
		IconElement.innerHTML =
			'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>';

		const Filename = HeaderLeft.createDiv({ cls: 'html-embed-filename' });
		Filename.textContent = this.File.basename;

		const HeaderRight = Header.createDiv({ cls: 'html-embed-header-right' });
		this.CreateTextButton(HeaderRight, OpenIconSvg, 'Open in a New Tab', () => {
			this.Plugin.app.workspace.openLinkText(this.File.path, '', false);
		});

		const EmbedContent = EmbedContainer.createDiv({ cls: 'markdown-embed-content' });
		const PreviewView = EmbedContent.createDiv({ cls: 'markdown-preview-view' });
		const Sizer = PreviewView.createDiv({
			cls: 'markdown-preview-sizer markdown-preview-section',
		});

		this.RenderIframeContainer(Sizer, HtmlContent, IsLoading);
	}

	private RenderNativeLivePreviewEmbed(HtmlContent: string, IsLoading: boolean): void {
		const Header = this.containerEl.createDiv({ cls: 'html-embed-header' });
		const HeaderLeft = Header.createDiv({ cls: 'html-embed-header-left' });

		const IconElement = HeaderLeft.createDiv({ cls: 'html-embed-icon' });
		IconElement.innerHTML =
			'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>';

		const Filename = HeaderLeft.createDiv({ cls: 'html-embed-filename' });
		Filename.textContent = this.File.basename;

		const HeaderRight = Header.createDiv({ cls: 'html-embed-header-right' });

		this.CreateTextButton(HeaderRight, OpenIconSvg, 'Open in a New Tab', () => {
			this.Plugin.app.workspace.openLinkText(this.File.path, '', false);
		});

		this.RenderIframeContainer(this.containerEl, HtmlContent, IsLoading);
	}

	private RenderIframeContainer(
		ContainerElement: HTMLElement,
		HtmlContent: string,
		IsLoading: boolean
	): void {
		const IframeContainer = ContainerElement.createDiv({ cls: 'html-embed-iframe-container' });
		IframeContainer.style.height = `${HTML_EMBED_HEIGHT_PX}px`;
		IframeContainer.style.position = 'relative';

		const Iframe = IframeContainer.createEl('iframe');
		Iframe.style.width = '100%';
		Iframe.style.height = `${HTML_EMBED_HEIGHT_PX}px`;
		Iframe.style.border = 'none';
		Iframe.style.display = 'block';
		Iframe.style.overflow = 'auto';
		Iframe.setAttribute('sandbox', HTML_EMBED_IFRAME_SANDBOX);

		if (IsLoading) {
			Iframe.style.visibility = 'hidden';
			return;
		}

		this.RenderIframeAsync(Iframe, HtmlContent);
	}

	private CreateTextButton(
		ContainerElement: HTMLElement,
		IconSvg: string,
		Label: string,
		OnClick: () => void
	): void {
		const Button = ContainerElement.createEl('button', {
			cls: 'html-embed-button html-embed-button-text',
			attr: { type: 'button' },
		});

		const IconContainer = Button.createSpan({ cls: 'html-embed-button-icon' });
		IconContainer.innerHTML = IconSvg;
		Button.createSpan({ cls: 'html-embed-button-label', text: Label });

		Button.addEventListener('click', (Event: MouseEvent) => {
			Event.preventDefault();
			Event.stopPropagation();
			OnClick();
		});
	}

	private RenderIframeAsync(Iframe: HTMLIFrameElement, HtmlContent: string): void {
		ScheduleNonBlockingRender(() => {
			if (this.IsDisposed || !Iframe.isConnected) {
				return;
			}

			try {
				Iframe.addEventListener(
					'load',
					() => {
						if (this.IsDisposed || !this.Plugin.ShouldLogEmbedRendered(this.File.path)) {
							return;
						}

						this.Plugin.MarkEmbedRenderedLogged(this.File.path);
						this.Plugin.LogEmbedRendered(this.File.path, performance.now() - this.RenderStartMs);
					},
					{ once: true }
				);

				if (this.BlobUrl) {
					URL.revokeObjectURL(this.BlobUrl);
				}

				const BlobContent = new Blob([HtmlContent], { type: 'text/html' });
				this.BlobUrl = URL.createObjectURL(BlobContent);
				Iframe.src = this.BlobUrl;
				Iframe.style.visibility = 'visible';
			} catch (ErrorValue) {
				try {
					this.FallbackSyncRender(Iframe, HtmlContent);
				} catch (FallbackError) {
					this.Plugin.LogPluginError('render embed', FallbackError, this.File.path);
					this.RenderError(
						`Error rendering HTML embed: ${FallbackError instanceof Error ? FallbackError.message : String(FallbackError)}`
					);
				}
			}
		});
	}

	private FallbackSyncRender(Iframe: HTMLIFrameElement, HtmlContent: string): void {
		const IframeDocument = Iframe.contentDocument;
		if (!IframeDocument) {
			this.RenderError('Error rendering HTML embed: Unable to access iframe document.');
			return;
		}

		IframeDocument.open();
		IframeDocument.write(HtmlContent);
		IframeDocument.close();
	}

	private RenderError(Message: string): void {
		this.containerEl.empty();
		this.containerEl.addClass('internal-embed', 'is-loaded', 'html-embed');
		this.containerEl.classList.remove('is-loading');
		this.containerEl.classList.toggle(
			NativeLivePreviewEmbedClass,
			this.RenderMode === 'native-live-preview'
		);

		const ErrorElement = this.containerEl.createDiv({ cls: 'html-embed-error' });
		ErrorElement.style.padding = '12px';
		ErrorElement.style.background = 'var(--background-secondary)';
		ErrorElement.style.color = 'var(--text-error)';
		ErrorElement.style.borderRadius = '4px';
		ErrorElement.style.fontSize = '12px';
		ErrorElement.textContent = Message;
	}

	onunload() {
		this.IsDisposed = true;

		if (this.BlobUrl) {
			URL.revokeObjectURL(this.BlobUrl);
			this.BlobUrl = null;
		}
	}
}
