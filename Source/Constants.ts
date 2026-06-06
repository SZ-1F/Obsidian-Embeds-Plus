export const VIEW_TYPE_HTML = 'obsidian-embeds-plus-html-view';

export const HTML_EMBED_HEIGHT_PX = 842;
export const HTML_EMBED_IFRAME_SANDBOX =
	'allow-popups allow-popups-to-escape-sandbox';
export const FILE_MODIFY_DEBOUNCE_MS = 300;
export const NON_BLOCKING_RENDER_TIMEOUT_MS = 100;
export const HTML_LOAD_FAILURE_TIMEOUT_MS = 15000;
declare const __RENDER_CACHE_VERSION__: number;
export const RENDERED_HTML_CACHE_VERSION =
	typeof __RENDER_CACHE_VERSION__ === 'number'
		? __RENDER_CACHE_VERSION__
		: 0;

const HtmlEmbedExtensions = new Set(['html', 'mhtml', 'mht', 'webarchive', 'enex']);
const HtmlViewExtensions = new Set(['html', 'mhtml', 'mht', 'webarchive', 'enex']);

export function IsHtmlEmbedExtension(Extension: string): boolean {
	return HtmlEmbedExtensions.has(Extension.toLowerCase());
}

export function IsHtmlViewExtension(Extension: string): boolean {
	return HtmlViewExtensions.has(Extension.toLowerCase());
}

/**
 * Constants for ENEX parsing.
*/

// Define regular expression for matching Evernote's custom properties.
export const ENCustomPropertiesRegex: RegExp = /(--en-[\w-]+)(?:\s*:\s*([^;]+))?/g;

// List of ignored Evernote metadata properties.
export const IgnoredENProps: Set<string> = new Set([
  // Custom metadata properties.
  "--en-chs",
  "--en-content-hash",
  "--en-nodeId",
  "--en-id",
  "--en-lineWrapping",
  "--en-isCollapsed",
  "--en-toggle",
  "--en-expanded",
  "--en-requiredFeatures",
  "--en-emoji",
  "--en-color",
  "--en-clipped-source-url",
  "--en-clipped-source-title",
]);

// List of known Evernote custom properties. Elements covered by this list need custom handling.
export const KnownENElements: Set<string> = new Set([
  // Custom properties.
  "--en-calendarEvent",
  "--en-calendarBlock",
  "--en-codeblock",
  "--en-task-group",
  "--en-callout",
  "--en-clipped-content",
  //"--en-tableofcontents",
  "--en-todo",
  // Custom Evernote tags.
  "en-media"
]);

// Define a placeholder element to display for unknown element types.
export const PlaceholderEl: string = `<div class="en-block-unsupported"><p>This element is not currently supported in Embeds+</p></div>`;
export const MediaPlaceholderEl: string = `<div class="en-block-unsupported-media"><p>Unsupported attachment</p></p></div>`;
