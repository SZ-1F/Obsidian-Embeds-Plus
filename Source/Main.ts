import type { EditorView } from '@codemirror/view';
import {
	MarkdownPostProcessorContext,
	MarkdownView,
	Plugin,
	TFile,
	WorkspaceLeaf,
	parseLinktext as ParseLinktext,
} from 'obsidian';
import {
	VIEW_TYPE_HTML,
	IsHtmlEmbedExtension,
} from './Constants';
import { HTMLEmbedRenderer } from './HTMLEmbedRenderer';
import { HTMLFileView } from './HTMLFileView';
import {
	CreateHtmlEmbedStateField,
	HtmlCacheUpdateEffect,
} from './CodeMirrorExtensions';
import { SanitiseHtml } from './HTMLSanitiser';

interface MarkdownViewWithCm extends MarkdownView {
	editor: MarkdownView['editor'] & {
		cm?: EditorView;
	};
}

export default class HtmlViewerPlugin extends Plugin {
	HtmlCache: Map<string, string> = new Map();

	async onload() {
		this.registerView(VIEW_TYPE_HTML, (Leaf: WorkspaceLeaf) => new HTMLFileView(Leaf, this));
		this.registerExtensions(['html', 'mhtml', 'webarchive'], VIEW_TYPE_HTML);
		this.registerEditorExtension(CreateHtmlEmbedStateField(this));

		const PostProcessor = this.registerMarkdownPostProcessor((Element, Context) => {
			const EmbedElements = Element.querySelectorAll('.internal-embed');
			for (const EmbedElement of Array.from(EmbedElements)) {
				this.ProcessReadingViewEmbed(EmbedElement as HTMLElement, Context);
			}

			const LinkElements = Element.querySelectorAll('a.internal-link');
			for (const LinkElement of Array.from(LinkElements)) {
				this.ProcessReadingViewLink(LinkElement as HTMLAnchorElement, Context);
			}
		});

		PostProcessor.sortOrder = 100;

		this.registerEvent(
			this.app.vault.on('modify', (File) => {
				if (!(File instanceof TFile)) {
					return;
				}

				if (!IsHtmlEmbedExtension(File.extension)) {
					return;
				}

				void this.LoadAndCacheHtml(File);
			})
		);
	}

	ResolveHtmlFile(FilePath: string, SourcePath: string): TFile | null {
		const ParsedLink = ParseLinktext(FilePath);
		const Extension = ParsedLink.path.split('.').pop() ?? '';
		if (!IsHtmlEmbedExtension(Extension)) {
			return null;
		}

		const File = this.app.metadataCache.getFirstLinkpathDest(ParsedLink.path, SourcePath);
		if (!(File instanceof TFile)) {
			return null;
		}

		return File;
	}

	async GetCachedHtmlContent(File: TFile): Promise<string> {
		const CachedContent = this.HtmlCache.get(File.path);
		if (CachedContent !== undefined) {
			return CachedContent;
		}

		await this.LoadAndCacheHtml(File);
		return this.HtmlCache.get(File.path) ?? '';
	}

	private ProcessReadingViewEmbed(
		EmbedElement: HTMLElement,
		Context: MarkdownPostProcessorContext
	): void {
		if (EmbedElement.hasClass('html-embed')) {
			return;
		}

		let FilePath = EmbedElement.getAttribute('src') || EmbedElement.getAttribute('alt');
		if (!FilePath) {
			const LinkElement = EmbedElement.querySelector('a.internal-link');
			if (LinkElement) {
				FilePath = LinkElement.getAttribute('data-href') || LinkElement.getAttribute('href');
			}
		}

		if (!FilePath) {
			return;
		}

		const File = this.ResolveHtmlFile(FilePath, Context.sourcePath);
		if (!File) {
			return;
		}

		const Renderer = new HTMLEmbedRenderer(EmbedElement, File, this);
		Context.addChild(Renderer);
	}

	private ProcessReadingViewLink(
		LinkElement: HTMLAnchorElement,
		Context: MarkdownPostProcessorContext
	): void {
		const FilePath = LinkElement.getAttribute('data-href') || LinkElement.getAttribute('href');
		if (!FilePath) {
			return;
		}

		const File = this.ResolveHtmlFile(FilePath, Context.sourcePath);
		if (!File) {
			return;
		}

		const EmbedWrapper = document.createElement('div');
		LinkElement.replaceWith(EmbedWrapper);

		const Renderer = new HTMLEmbedRenderer(EmbedWrapper, File, this);
		Context.addChild(Renderer);
	}

	async LoadAndCacheHtml(File: TFile): Promise<void> {
		try {
			const RawContent = await this.app.vault.read(File);
			const SanitisedContent = SanitiseHtml(RawContent);
			this.HtmlCache.set(File.path, SanitisedContent);
			this.DispatchCacheUpdate(File.path);
		} catch (ErrorValue) {
			console.error('Error loading HTML file:', ErrorValue);
			this.HtmlCache.set(File.path, '');
		}
	}

	private DispatchCacheUpdate(FilePath: string): void {
		this.app.workspace.iterateAllLeaves((Leaf) => {
			if (Leaf.view.getViewType() !== 'markdown') {
				return;
			}

			const MarkdownLeafView = Leaf.view as MarkdownViewWithCm;
			const CmEditor = MarkdownLeafView.editor.cm;
			if (!CmEditor) {
				return;
			}

			CmEditor.dispatch({
				effects: HtmlCacheUpdateEffect.of(FilePath),
			});
		});
	}

	onunload() {
		this.HtmlCache.clear();
	}
}
