export const VIEW_TYPE_HTML = 'obsidian-embeds-plus-html-view';

export const HTML_EMBED_HEIGHT_PX = 842;
export const HTML_EMBED_IFRAME_SANDBOX =
	'allow-popups allow-popups-to-escape-sandbox';
export const FILE_MODIFY_DEBOUNCE_MS = 300;
export const NON_BLOCKING_RENDER_TIMEOUT_MS = 100;
export const HTML_LOAD_FAILURE_TIMEOUT_MS = 15000;
export const RENDERED_HTML_CACHE_VERSION = 3;

const HtmlEmbedExtensions = new Set(['html', 'mhtml', 'mht', 'webarchive']);
const HtmlViewExtensions = new Set(['html', 'mhtml', 'mht', 'webarchive']);

export function IsHtmlEmbedExtension(Extension: string): boolean {
	return HtmlEmbedExtensions.has(Extension.toLowerCase());
}

export function IsHtmlViewExtension(Extension: string): boolean {
	return HtmlViewExtensions.has(Extension.toLowerCase());
}
