import { FileView, TFile, WorkspaceLeaf } from 'obsidian';
import {
	HTML_EMBED_IFRAME_SANDBOX,
	HTML_LOAD_FAILURE_TIMEOUT_MS,
	VIEW_TYPE_HTML,
	IsHtmlViewExtension,
} from './Constants';
import type HtmlViewerPlugin from './Main';
import { ScheduleNonBlockingRender, WithTimeout } from './Utils';

export class HTMLFileView extends FileView {
	private readonly Plugin: HtmlViewerPlugin;
	private CurrentFilePath: string | null = null;
	private RenderToken = 0;
	private IframeLoadTimeout: number | null = null;

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
		this.CurrentFilePath = File.path;
		this.RenderToken++;
		const CurrentRenderToken = this.RenderToken;
		this.ClearIframeLoadTimeout();

		try {
			const Entry = await WithTimeout(
				this.Plugin.GetCachedContent(File),
				HTML_LOAD_FAILURE_TIMEOUT_MS,
				`Timed out loading archived content after ${HTML_LOAD_FAILURE_TIMEOUT_MS / 1000} seconds`
			);
			if (!this.IsRenderTokenCurrent(CurrentRenderToken, File.path)) {
				return;
			}

			this.RenderHtml(Entry.Html, CurrentRenderToken);
		} catch (ErrorValue) {
			if (!this.IsRenderTokenCurrent(CurrentRenderToken, File.path)) {
				return;
			}

			this.Plugin.LogPluginError('load file view', ErrorValue, File.path);
			this.RenderError(
				`Error loading file: ${ErrorValue instanceof Error ? ErrorValue.message : String(ErrorValue)}`
			);
		}
	}

	private RenderHtml(HtmlContent: string, RenderToken: number): void {
		this.contentEl.empty();

		const Iframe = this.contentEl.createEl('iframe');
		Iframe.style.width = '100%';
		Iframe.style.height = '100%';
		Iframe.style.border = 'none';
		Iframe.style.display = 'block';
		Iframe.setAttribute('sandbox', HTML_EMBED_IFRAME_SANDBOX);

		this.RenderIframeAsync(Iframe, HtmlContent, RenderToken);
	}

	private RenderIframeAsync(
		Iframe: HTMLIFrameElement,
		HtmlContent: string,
		RenderToken: number
	): void {
		const FilePath = this.CurrentFilePath;
		if (FilePath) {
			const CachedBlobUrl = this.Plugin.GetOrCreateBlobUrl(FilePath);
			if (CachedBlobUrl) {
				this.RenderWithBlobUrl(Iframe, CachedBlobUrl, RenderToken, FilePath);
				return;
			}
		}

		ScheduleNonBlockingRender(() => {
			if (!this.IsRenderTokenCurrent(RenderToken, FilePath)) {
				return;
			}

			try {
				if (FilePath) {
					const BlobUrl = this.Plugin.GetOrCreateBlobUrl(FilePath);
					if (BlobUrl) {
						this.RenderWithBlobUrl(Iframe, BlobUrl, RenderToken, FilePath);
						return;
					}
				}

				this.FallbackSyncRender(Iframe, HtmlContent);
			} catch (ErrorValue) {
				try {
					this.FallbackSyncRender(Iframe, HtmlContent);
				} catch (FallbackError) {
					this.Plugin.LogPluginError(
						'render file view',
						FallbackError,
						this.file?.path
					);
				}
			}
		});
	}

	private RenderWithBlobUrl(
		Iframe: HTMLIFrameElement,
		BlobUrl: string,
		RenderToken: number,
		FilePath: string
	): void {
		if (!this.IsRenderTokenCurrent(RenderToken, FilePath)) {
			return;
		}

		this.ClearIframeLoadTimeout();
		this.IframeLoadTimeout = window.setTimeout(() => {
			this.IframeLoadTimeout = null;
			if (!this.IsRenderTokenCurrent(RenderToken, FilePath)) {
				return;
			}

			this.RenderToken++;
			this.Plugin.LogPluginError(
				'load file view iframe',
				new Error(
					`Timed out loading preview iframe after ${HTML_LOAD_FAILURE_TIMEOUT_MS / 1000} seconds`
				),
				FilePath
			);
			this.RenderError(
				`Error loading file: Timed out loading preview iframe after ${HTML_LOAD_FAILURE_TIMEOUT_MS / 1000} seconds.`
			);
		}, HTML_LOAD_FAILURE_TIMEOUT_MS);

		Iframe.addEventListener(
			'load',
			() => {
				this.ClearIframeLoadTimeout();
			},
			{ once: true }
		);

		Iframe.addEventListener(
			'error',
			() => {
				this.ClearIframeLoadTimeout();
				if (!this.IsRenderTokenCurrent(RenderToken, FilePath)) {
					return;
				}

				this.Plugin.LogPluginError(
					'load file view iframe',
					new Error('Preview iframe failed to load'),
					FilePath
				);
				this.RenderError('Error loading file: Preview iframe failed to load.');
			},
			{ once: true }
		);

		Iframe.src = BlobUrl;
	}

	private FallbackSyncRender(Iframe: HTMLIFrameElement, HtmlContent: string): void {
		const IframeDocument = Iframe.contentDocument;
		if (!IframeDocument) {
			this.Plugin.LogPluginError(
				'render file view',
				new Error('Unable to access iframe document'),
				this.file?.path
			);
			this.RenderError('Error loading file: Unable to access iframe document.');
			return;
		}

		IframeDocument.open();
		IframeDocument.write(HtmlContent);
		IframeDocument.close();
	}

	private RenderError(Message: string): void {
		this.contentEl.empty();
		const ErrorElement = this.contentEl.createDiv({ cls: 'html-embed-error' });
		ErrorElement.style.margin = '12px';
		ErrorElement.textContent = Message;
	}

	async onUnloadFile(_File: TFile) {
		// The plugin owns blob URL cleanup.
		this.RenderToken++;
		this.ClearIframeLoadTimeout();
		this.CurrentFilePath = null;
	}

	private ClearIframeLoadTimeout(): void {
		if (this.IframeLoadTimeout !== null) {
			window.clearTimeout(this.IframeLoadTimeout);
			this.IframeLoadTimeout = null;
		}
	}

	private IsRenderTokenCurrent(RenderToken: number, FilePath: string | null): boolean {
		return (
			RenderToken === this.RenderToken &&
			FilePath !== null &&
			this.CurrentFilePath === FilePath
		);
	}
}
