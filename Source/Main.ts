import {
	MarkdownPostProcessorContext,
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
import { SanitiseHtml } from './HTMLSanitiser';

export default class HtmlViewerPlugin extends Plugin {
	async onload() {
		this.registerView(VIEW_TYPE_HTML, (Leaf: WorkspaceLeaf) => new HTMLFileView(Leaf, this));
		this.registerExtensions(['html', 'mhtml', 'webarchive'], VIEW_TYPE_HTML);

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
		const RawContent = await this.app.vault.read(File);
		return SanitiseHtml(RawContent);
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
}
