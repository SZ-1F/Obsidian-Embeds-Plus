import { FileView, TFile, WorkspaceLeaf } from 'obsidian';
import {
	HTML_EMBED_IFRAME_SANDBOX,
	VIEW_TYPE_HTML,
	IsHtmlViewExtension,
} from './Constants';
import type HtmlViewerPlugin from './Main';

export class HTMLFileView extends FileView {
	private readonly Plugin: HtmlViewerPlugin;

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
			const HtmlContent = await this.app.vault.read(File);
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
		Iframe.srcdoc = HtmlContent;
	}
}
