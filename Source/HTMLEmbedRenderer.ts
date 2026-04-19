import { MarkdownRenderChild, TFile } from 'obsidian';
import {
	HTML_EMBED_HEIGHT_PX,
	HTML_EMBED_IFRAME_SANDBOX,
	HTML_LOAD_FAILURE_TIMEOUT_MS,
} from './Constants';
import type HtmlViewerPlugin from './Main';
import { ScheduleNonBlockingRender, WithTimeout } from './Utils';
import {
	StartStage,
	EndStage,
	RecordStage,
	LogPerformanceSummary,
} from './Performance';

const OpenIconSvg =
	'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>';
const NativeLivePreviewEmbedClass = 'html-embed-native-live-preview';

type HTMLEmbedRenderMode = 'standard' | 'native-live-preview';

export class HTMLEmbedRenderer extends MarkdownRenderChild {
	private IsDisposed = false;
	private RenderStartMs = 0;
	private UsedCachedBlob = false;
	private BlobUrlChecked = false;
	private RenderToken = 0;
	private IframeLoadTimeout: number | null = null;

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
		this.RenderToken++;
		const CurrentRenderToken = this.RenderToken;
		this.ClearIframeLoadTimeout();
		this.RenderStartMs = performance.now();
		StartStage(this.File.path, 'totalRender');

		try {
			const CachedHash = this.Plugin.GetContentHash(this.File.path);
			if (!CachedHash) {
				this.RenderEmbed('', true);
			}

			const Entry = await WithTimeout(
				this.Plugin.GetCachedContent(this.File),
				HTML_LOAD_FAILURE_TIMEOUT_MS,
				`Timed out loading archived content after ${HTML_LOAD_FAILURE_TIMEOUT_MS / 1000} seconds`
			);
			if (!this.IsRenderTokenCurrent(CurrentRenderToken)) {
				return;
			}

			const ExistingBlobUrl = this.Plugin.GetOrCreateBlobUrl(this.File.path);
			this.UsedCachedBlob = !!ExistingBlobUrl;
			this.BlobUrlChecked = true;

			this.RenderEmbed(Entry.Html);
		} catch (ErrorValue) {
			if (!this.IsRenderTokenCurrent(CurrentRenderToken)) {
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
		const IframeContainer = ContainerElement.createDiv({
			cls: 'html-embed-iframe-container',
		});
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

		this.RenderIframeAsync(Iframe, HtmlContent, this.RenderToken);
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

	private RenderIframeAsync(
		Iframe: HTMLIFrameElement,
		HtmlContent: string,
		RenderToken: number
	): void {
		const CachedBlobUrl = this.Plugin.GetOrCreateBlobUrl(this.File.path);
		this.UsedCachedBlob = this.BlobUrlChecked || !!CachedBlobUrl;

		if (CachedBlobUrl) {
			this.RenderWithBlobUrl(Iframe, CachedBlobUrl, RenderToken);
			return;
		}

		ScheduleNonBlockingRender(() => {
			if (!this.IsRenderTokenCurrent(RenderToken) || !Iframe.isConnected) {
				return;
			}

			StartStage(this.File.path, 'createBlob');
			const NewBlobUrl = this.Plugin.GetOrCreateBlobUrl(this.File.path);
			RecordStage(
				this.File.path,
				'createBlob',
				EndStage(this.File.path, 'createBlob')
			);

			if (NewBlobUrl) {
				this.RenderWithBlobUrl(Iframe, NewBlobUrl, RenderToken);
			} else {
				this.FallbackSyncRender(Iframe, HtmlContent);
			}
		});
	}

	private RenderWithBlobUrl(
		Iframe: HTMLIFrameElement,
		BlobUrl: string,
		RenderToken: number
	): void {
		if (!this.IsRenderTokenCurrent(RenderToken) || !Iframe.isConnected) {
			return;
		}

		this.ClearIframeLoadTimeout();
		StartStage(this.File.path, 'iframeLoad');

		this.IframeLoadTimeout = window.setTimeout(() => {
			this.IframeLoadTimeout = null;
			if (!this.IsRenderTokenCurrent(RenderToken)) {
				return;
			}

			this.RenderToken++;
			this.Plugin.LogPluginError(
				'load iframe',
				new Error(
					`Timed out loading preview iframe after ${HTML_LOAD_FAILURE_TIMEOUT_MS / 1000} seconds`
				),
				this.File.path
			);
			this.RenderError(
				`Error rendering HTML embed: Timed out loading preview iframe after ${HTML_LOAD_FAILURE_TIMEOUT_MS / 1000} seconds.`
			);
		}, HTML_LOAD_FAILURE_TIMEOUT_MS);

		Iframe.addEventListener(
			'load',
			() => {
				this.ClearIframeLoadTimeout();
				if (!this.IsRenderTokenCurrent(RenderToken)) {
					return;
				}

				RecordStage(
					this.File.path,
					'iframeLoad',
					EndStage(this.File.path, 'iframeLoad')
				);

				if (this.IsDisposed || !this.Plugin.ShouldLogEmbedRendered(this.File.path)) {
					return;
				}

				this.Plugin.MarkEmbedRenderedLogged(this.File.path);
				const TotalMs = performance.now() - this.RenderStartMs;
				this.Plugin.LogEmbedRendered(this.File.path, TotalMs);

				const CacheType = this.UsedCachedBlob ? 'warm (blob cached)' : 'cold';
				LogPerformanceSummary(
					this.File.path,
					`render complete (${CacheType})`
				);
			},
			{ once: true }
		);

		Iframe.addEventListener(
			'error',
			() => {
				this.ClearIframeLoadTimeout();
				if (!this.IsRenderTokenCurrent(RenderToken)) {
					return;
				}

				this.Plugin.LogPluginError(
					'load iframe',
					new Error('Preview iframe failed to load'),
					this.File.path
				);
				this.RenderError('Error rendering HTML embed: Preview iframe failed to load.');
			},
			{ once: true }
		);

		Iframe.src = BlobUrl;
		Iframe.style.visibility = 'visible';
	}

	private FallbackSyncRender(Iframe: HTMLIFrameElement, HtmlContent: string): void {
		const IframeDocument = Iframe.contentDocument;
		if (!IframeDocument) {
			this.RenderError(
				'Error rendering HTML embed: Unable to access iframe document.'
			);
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
		this.RenderToken++;
		this.ClearIframeLoadTimeout();
		// The plugin owns blob URL cleanup.
	}

	private ClearIframeLoadTimeout(): void {
		if (this.IframeLoadTimeout !== null) {
			window.clearTimeout(this.IframeLoadTimeout);
			this.IframeLoadTimeout = null;
		}
	}

	private IsRenderTokenCurrent(RenderToken: number): boolean {
		return (
			RenderToken === this.RenderToken &&
			!this.IsDisposed &&
			this.containerEl.isConnected
		);
	}
}
