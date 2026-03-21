import { TFile } from 'obsidian';
import { EditorView, WidgetType, type Rect } from '@codemirror/view';
import {
	HTML_EMBED_HEIGHT_PX,
	HTML_EMBED_IFRAME_SANDBOX,
	HTML_EMBED_TOTAL_HEIGHT_PX,
} from './Constants';
import type HtmlViewerPlugin from './Main';

const OpenIconSvg =
	'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>';

export class HTMLEmbedWidget extends WidgetType {
	constructor(
		private readonly File: TFile,
		private readonly Plugin: HtmlViewerPlugin,
		private readonly HtmlContent: string,
		private readonly IsLoading: boolean
	) {
		super();
	}

	toDOM(_View: EditorView): HTMLElement {
		const Container = document.createElement('div');
		Container.className = 'html-embed-widget cm-embed-block';
		Container.contentEditable = 'false';
		Container.style.display = 'block';
		Container.style.width = '100%';
		Container.style.height = `${HTML_EMBED_TOTAL_HEIGHT_PX}px`;

		const Embed = Container.createDiv({ cls: 'internal-embed is-loaded html-embed' });
		if (this.IsLoading) {
			Embed.classList.add('is-loading');
		}

		const EmbedContainer = Embed.createDiv({ cls: 'markdown-embed' });
		const Header = EmbedContainer.createDiv({ cls: 'html-embed-header' });
		const HeaderLeft = Header.createDiv({ cls: 'html-embed-header-left' });
		const HeaderRight = Header.createDiv({ cls: 'html-embed-header-right' });

		const IconElement = HeaderLeft.createDiv({ cls: 'html-embed-icon' });
		IconElement.innerHTML =
			'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>';

		const Filename = HeaderLeft.createDiv({ cls: 'html-embed-filename' });
		Filename.textContent = this.File.basename;

		const OpenButton = HeaderRight.createDiv({
			cls: 'html-embed-button',
			attr: { 'aria-label': 'Open in new tab' },
		});
		OpenButton.innerHTML = OpenIconSvg;
		OpenButton.addEventListener('click', (Event) => {
			Event.preventDefault();
			Event.stopPropagation();
			this.Plugin.app.workspace.openLinkText(this.File.path, '', false);
		});

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

		if (this.IsLoading) {
			Iframe.style.visibility = 'hidden';
		} else {
			Iframe.srcdoc = this.HtmlContent;
		}

		return Container;
	}

	eq(Other: WidgetType): boolean {
		if (!(Other instanceof HTMLEmbedWidget)) {
			return false;
		}

		return (
			this.File.path === Other.File.path &&
			this.HtmlContent === Other.HtmlContent &&
			this.IsLoading === Other.IsLoading
		);
	}

	ignoreEvent(): boolean {
		return false;
	}

	coordsAt(_Dom: HTMLElement, _Pos: number, _Side: number): Rect | null {
		return null;
	}

	updateDOM(_Dom: HTMLElement): boolean {
		return false;
	}

	get estimatedHeight(): number {
		return HTML_EMBED_TOTAL_HEIGHT_PX;
	}
}
