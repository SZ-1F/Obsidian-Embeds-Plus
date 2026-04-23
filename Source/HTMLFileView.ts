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
	private IframeLoadTimeout: { RenderToken: number; Timer: number } | null = null;

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

		const Iframe = this.contentEl.createEl('iframe', { cls: 'html-file-view-iframe' });
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

			if (FilePath) {
				const BlobUrl = this.Plugin.GetOrCreateBlobUrl(FilePath);
				if (BlobUrl) {
					this.RenderWithBlobUrl(Iframe, BlobUrl, RenderToken, FilePath);
					return;
				}
			}

			this.FallbackSrcDocRender(Iframe, HtmlContent);
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
		const TimeoutTimer = window.setTimeout(() => {
			if (this.IframeLoadTimeout?.RenderToken === RenderToken) {
				this.IframeLoadTimeout = null;
			}

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
		this.IframeLoadTimeout = { RenderToken, Timer: TimeoutTimer };

		Iframe.addEventListener(
			'load',
			() => {
				if (!this.IsRenderTokenCurrent(RenderToken, FilePath)) {
					return;
				}

				this.ClearIframeLoadTimeout(RenderToken);
			},
			{ once: true }
		);

		Iframe.addEventListener(
			'error',
			() => {
				if (!this.IsRenderTokenCurrent(RenderToken, FilePath)) {
					return;
				}
				this.ClearIframeLoadTimeout(RenderToken);

				this.Plugin.LogPluginError(
					'load file view iframe',
					new Error('Preview iframe failed to load'),
					FilePath
				);
				this.RenderToken++;
				this.RenderError('Error loading file: Preview iframe failed to load.');
			},
			{ once: true }
		);

		Iframe.src = BlobUrl;
	}

	private FallbackSrcDocRender(Iframe: HTMLIFrameElement, HtmlContent: string): void {
		Iframe.srcdoc = HtmlContent;
	}

	private RenderError(Message: string): void {
		this.contentEl.empty();
		const ErrorElement = this.contentEl.createDiv({
			cls: 'html-embed-error html-file-view-error',
		});
		ErrorElement.textContent = Message;
	}

	async onUnloadFile(_File: TFile) {
		// The plugin owns blob URL cleanup.
		this.RenderToken++;
		this.ClearIframeLoadTimeout();
		this.CurrentFilePath = null;
	}

	private ClearIframeLoadTimeout(RenderToken?: number): void {
		if (this.IframeLoadTimeout !== null) {
			if (
				RenderToken !== undefined &&
				this.IframeLoadTimeout.RenderToken !== RenderToken
			) {
				return;
			}

			window.clearTimeout(this.IframeLoadTimeout.Timer);
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
