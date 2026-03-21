export const VIEW_TYPE_HTML = 'html-view';

export const HTML_EMBED_IFRAME_SANDBOX =
	'allow-same-origin allow-popups allow-popups-to-escape-sandbox';

const HtmlViewExtensions = new Set(['html', 'mhtml', 'mht', 'webarchive']);

export function IsHtmlViewExtension(Extension: string): boolean {
	return HtmlViewExtensions.has(Extension.toLowerCase());
}
