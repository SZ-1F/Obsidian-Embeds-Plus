export const VIEW_TYPE_HTML = 'html-view';

export const HTML_EMBED_HEIGHT_PX = 842;
export const HTML_EMBED_TOTAL_HEIGHT_PX = 890;
export const HTML_EMBED_IFRAME_SANDBOX =
	'allow-same-origin allow-popups allow-popups-to-escape-sandbox';
export const NON_BLOCKING_RENDER_TIMEOUT_MS = 100;

export const HTML_EMBED_LINK_PATTERN =
	'!?\[\[([^\]]+\.(html|mhtml|webarchive))(?:\|([^\]]+))?\]\]';

const HtmlEmbedExtensions = new Set(['html', 'mhtml', 'webarchive']);
const HtmlViewExtensions = new Set(['html', 'mhtml', 'mht', 'webarchive']);

export function IsHtmlEmbedExtension(Extension: string): boolean {
	return HtmlEmbedExtensions.has(Extension.toLowerCase());
}

export function IsHtmlViewExtension(Extension: string): boolean {
	return HtmlViewExtensions.has(Extension.toLowerCase());
}
