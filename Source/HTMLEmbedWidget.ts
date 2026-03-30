import { EditorSelection } from '@codemirror/state';
import { EditorView, WidgetType, type Rect } from '@codemirror/view';
import { TFile } from 'obsidian';
import { ConfirmModal } from './ConfirmModal';
import {
	HTML_EMBED_HEIGHT_PX,
	HTML_EMBED_IFRAME_SANDBOX,
	HTML_EMBED_TOTAL_HEIGHT_PX,
} from './Constants';
import {
	ClearHtmlEmbedRevealEffect,
	RevealHtmlEmbedEffect,
} from './CodeMirrorExtensions';
import type HtmlViewerPlugin from './Main';
import { CreateHtmlEmbedRegex } from './Utils';

const EditIconSvg =
	'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
const OpenIconSvg =
	'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>';
const DeleteIconSvg =
	'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';

export class HTMLEmbedWidget extends WidgetType {
	private CurrentEditorView: EditorView | null = null;
	private readonly ContentHashValue: string;
	private BlobUrl: string | null = null;

	constructor(
		private readonly File: TFile,
		private readonly Plugin: HtmlViewerPlugin,
		private readonly HtmlContent: string,
		private readonly IsLoading: boolean,
		private readonly LinkStart: number,
		private readonly LinkEnd: number
	) {
		super();
		this.ContentHashValue = IsLoading
			? 'loading'
			: (Plugin.HtmlHashCache.get(File.path) ?? '');
	}

	toDOM(View: EditorView): HTMLElement {
		this.CurrentEditorView = View;

		const Container = document.createElement('div');
		Container.className = 'html-embed-widget cm-embed-block';
		Container.contentEditable = 'false';
		Container.setAttribute('data-html-embed-path', this.File.path);
		Container.setAttribute('data-link-start', this.LinkStart.toString());
		Container.setAttribute('data-link-end', this.LinkEnd.toString());
		Container.style.display = 'block';
		Container.style.width = '100%';
		Container.style.height = `${HTML_EMBED_TOTAL_HEIGHT_PX}px`;
		Container.style.userSelect = 'none';
		Container.style.pointerEvents = 'auto';

		console.debug('[HTML-Embed] Rendering widget for', this.File.path, 'loading:', this.IsLoading);

		const Embed = Container.createDiv({ cls: 'internal-embed is-loaded html-embed' });
		if (this.IsLoading) {
			Embed.classList.add('is-loading');
		}

		const EmbedContainer = Embed.createDiv({ cls: 'markdown-embed' });
		const Header = EmbedContainer.createDiv({ cls: 'html-embed-header' });
		const HeaderLeft = Header.createDiv({ cls: 'html-embed-header-left' });

		const IconElement = HeaderLeft.createDiv({ cls: 'html-embed-icon' });
		IconElement.innerHTML =
			'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>';

		const Filename = HeaderLeft.createDiv({ cls: 'html-embed-filename' });
		Filename.textContent = this.File.basename;

		const HeaderRight = Header.createDiv({ cls: 'html-embed-header-right' });
		this.CreateHeaderButton(HeaderRight, 'Edit embed', EditIconSvg, null, () => this.EditEmbed());
		this.CreateTextButton(HeaderRight, OpenIconSvg, 'Open in a New Tab', () => {
			this.Plugin.app.workspace.openLinkText(this.File.path, '', false);
		});
		this.CreateHeaderButton(
			HeaderRight,
			'Delete embed',
			DeleteIconSvg,
			'html-embed-delete-button',
			() => this.DeleteEmbed()
		);

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

		if (this.IsLoading) {
			Iframe.style.visibility = 'hidden';
		}

		if (!this.IsLoading) {
			this.RenderIframeContent(Iframe);
		}

		return Container;
	}

	private CreateHeaderButton(
		Container: HTMLElement,
		AriaLabel: string,
		IconSvg: string,
		ExtraClass: string | null,
		OnClick: () => void
	): void {
		const ClassName = ExtraClass ? `html-embed-button ${ExtraClass}` : 'html-embed-button';
		const Button = Container.createDiv({
			cls: ClassName,
			attr: { 'aria-label': AriaLabel },
		});
		Button.innerHTML = IconSvg;
		Button.addEventListener('click', (Event) => {
			Event.preventDefault();
			Event.stopPropagation();
			OnClick();
		});
	}

	private CreateTextButton(
		Container: HTMLElement,
		IconSvg: string,
		Label: string,
		OnClick: () => void
	): void {
		const Button = Container.createEl('button', {
			cls: 'html-embed-button html-embed-button-text',
			attr: { type: 'button' },
		});

		const IconContainer = Button.createSpan({ cls: 'html-embed-button-icon' });
		IconContainer.innerHTML = IconSvg;
		Button.createSpan({ cls: 'html-embed-button-label', text: Label });

		Button.addEventListener('click', (Event) => {
			Event.preventDefault();
			Event.stopPropagation();
			OnClick();
		});
	}

	private RenderIframeContent(Iframe: HTMLIFrameElement): void {
		// Revoke previous blob URL if one exists on this iframe.
		if (Iframe.src?.startsWith('blob:')) {
			URL.revokeObjectURL(Iframe.src);
		}

		console.debug('[HTML-Embed] Rendering iframe content for', this.File.path);
		const BlobContent = new Blob([this.HtmlContent], { type: 'text/html' });
		this.BlobUrl = URL.createObjectURL(BlobContent);
		Iframe.src = this.BlobUrl;
		Iframe.style.visibility = 'visible';
	}

	private FindLinkRange(): { from: number; to: number } | null {
		if (!this.CurrentEditorView) {
			return null;
		}

		const DocumentText = this.CurrentEditorView.state.doc.toString();
		const EmbedRegex = CreateHtmlEmbedRegex();
		const FileName = this.File.name;
		const FilePath = this.File.path;

		let Match: RegExpExecArray | null = null;
		while ((Match = EmbedRegex.exec(DocumentText)) !== null) {
			const LinkPath = Match[1];
			if (LinkPath === FilePath || LinkPath === FileName) {
				return { from: Match.index, to: Match.index + Match[0].length };
			}
		}

		return null;
	}

	private EditEmbed(): void {
		if (!this.CurrentEditorView) {
			return;
		}

		const Range = this.FindLinkRange();
		if (!Range) {
			return;
		}

		const CursorPosition = Math.min(Range.from + 3, Range.to);

		this.CurrentEditorView.dispatch({
			effects: [
				ClearHtmlEmbedRevealEffect.of(),
				RevealHtmlEmbedEffect.of(Range),
			],
			selection: EditorSelection.single(CursorPosition),
			scrollIntoView: true,
		});
		this.CurrentEditorView.focus();
	}

	private DeleteEmbed(): void {
		if (!this.CurrentEditorView) {
			return;
		}

		const Modal = new ConfirmModal(
			this.Plugin.app,
			'Remove HTML embed',
			'Remove this embed from the current note? The source file will not be deleted.',
			'Remove embed',
			() => {
				if (!this.CurrentEditorView) {
					return;
				}

				// Find current position at confirm time, not at modal-open time.
				const Range = this.FindLinkRange();
				if (!Range) {
					return;
				}

				this.CurrentEditorView.dispatch({
					changes: { from: Range.from, to: Range.to },
					scrollIntoView: true,
				});
				this.CurrentEditorView.focus();
			}
		);

		Modal.open();
	}

	eq(Other: WidgetType): boolean {
		if (!(Other instanceof HTMLEmbedWidget)) {
			return false;
		}

		return (
			this.File.path === Other.File.path &&
			this.ContentHashValue === Other.ContentHashValue &&
			this.IsLoading === Other.IsLoading
		);
	}

	ignoreEvent(): boolean {
		return false;
	}

	coordsAt(_Dom: HTMLElement, _Pos: number, _Side: number): Rect | null {
		return null;
	}

	updateDOM(Dom: HTMLElement, View: EditorView): boolean {
		this.CurrentEditorView = View;
		Dom.setAttribute('data-link-start', this.LinkStart.toString());
		Dom.setAttribute('data-link-end', this.LinkEnd.toString());

		if (this.IsLoading) {
			return true;
		}

		const Embed = Dom.querySelector('.html-embed');
		if (Embed) {
			Embed.classList.remove('is-loading');
		}

		const Iframe = Dom.querySelector('iframe') as HTMLIFrameElement | null;
		if (!Iframe) {
			return false;
		}

		this.RenderIframeContent(Iframe);
		return true;
	}

	get estimatedHeight(): number {
		return HTML_EMBED_TOTAL_HEIGHT_PX;
	}

	destroy(_Dom: HTMLElement): void {
		console.debug('[HTML-Embed] Widget destroyed for', this.File.path);

		if (this.BlobUrl) {
			URL.revokeObjectURL(this.BlobUrl);
			this.BlobUrl = null;
		}
	}
}
