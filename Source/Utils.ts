import { HTML_EMBED_LINK_PATTERN } from './Constants';

export function CreateHtmlEmbedRegex(): RegExp {
	return new RegExp(HTML_EMBED_LINK_PATTERN, 'gi');
}
