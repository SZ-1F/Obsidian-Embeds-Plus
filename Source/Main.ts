import { Plugin, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_HTML } from './Constants';
import { HTMLFileView } from './HTMLFileView';

export default class HtmlViewerPlugin extends Plugin {
	async onload() {
		this.registerView(VIEW_TYPE_HTML, (Leaf: WorkspaceLeaf) => new HTMLFileView(Leaf, this));
		this.registerExtensions(['html', 'mhtml', 'webarchive'], VIEW_TYPE_HTML);
	}
}
