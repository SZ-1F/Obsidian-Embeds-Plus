import { parse as ParsePlist } from '@plist/plist';
import { WebArchiveData, WebResource } from './Interfaces';
import { EnsureUint8Array, Uint8ArrayToBase64, Uint8ArrayToString } from './Utils';

/**
 * Parses a WebArchive file and extracts the main HTML content with embedded resources.
 */
export function ParseWebArchive(BinaryData: ArrayBuffer): string {
	try {
		console.debug('[WebArchive] Starting to parse WebArchive file');

		const PlistData = ParsePlist(BinaryData) as WebArchiveData;
		if (!PlistData) {
			console.error('[WebArchive] Failed to parse plist data');
			return '<html><body><p>Unable to parse WebArchive file. The file may be corrupted.</p></body></html>';
		}

		const MainResource = PlistData.WebMainResource;
		if (!MainResource || !MainResource.WebResourceData) {
			console.error('[WebArchive] No main resource found in WebArchive');
			return '<html><body><p>Unable to find main HTML content in WebArchive file.</p></body></html>';
		}

		const MainResourceData = EnsureUint8Array(MainResource.WebResourceData);
		let HtmlContent = Uint8ArrayToString(MainResourceData);
		console.debug('[WebArchive] Extracted main HTML content, length:', HtmlContent.length);

		const AllResources = CollectAllResources(PlistData);
		console.debug(`[WebArchive] Collected ${AllResources.length} total resources (including subframes)`);

		const CssResources: Array<{ Url: string; Content: string }> = [];
		const ResourceMap = new Map<string, string>();

		for (const Resource of AllResources) {
			if (!Resource.WebResourceURL || !Resource.WebResourceData || !Resource.WebResourceMIMEType) {
				continue;
			}

			const Url = Resource.WebResourceURL;
			const MimeType = Resource.WebResourceMIMEType;
			const Data = EnsureUint8Array(Resource.WebResourceData);

			if (MimeType === 'text/css') {
				const CssContent = Uint8ArrayToString(Data);
				CssResources.push({ Url, Content: CssContent });
				continue;
			}

			const Base64Data = Uint8ArrayToBase64(Data);
			const DataUri = `data:${MimeType};base64,${Base64Data}`;
			AddResourceVariants(ResourceMap, Url, DataUri);
		}

		console.debug(`[WebArchive] ${CssResources.length} CSS resources, ${ResourceMap.size} resource mappings`);

		HtmlContent = ReplaceResourceUrls(HtmlContent, ResourceMap);
		HtmlContent = InjectCssResources(HtmlContent, CssResources, ResourceMap);
		HtmlContent = HtmlContent.replace(/<base[^>]*>/gi, '');

		console.debug('[WebArchive] Successfully parsed WebArchive file');
		return HtmlContent;
	} catch (ErrorValue) {
		console.error('[WebArchive] Error parsing WebArchive:', ErrorValue);
		return `<html><body><p>Error parsing WebArchive file: ${ErrorValue instanceof Error ? ErrorValue.message : String(ErrorValue)}</p></body></html>`;
	}
}

/**
 * Recursively collects all subresources from the archive, including
 * resources nested inside WebSubframeArchives.
 */
function CollectAllResources(Archive: WebArchiveData): WebResource[] {
	const Resources: WebResource[] = [];

	if (Archive.WebSubresources) {
		Resources.push(...Archive.WebSubresources);
	}

	// Recurse into subframe archives (for example iframes on the original page).
	if (Archive.WebSubframeArchives) {
		for (const Subframe of Archive.WebSubframeArchives) {
			Resources.push(...CollectAllResources(Subframe));
		}
	}

	return Resources;
}

/**
 * Adds multiple URL variants to the resource map for flexible matching.
 * Handles absolute, protocol-relative, decoded, filename-only, and path-suffix forms.
 */
function AddResourceVariants(MapValue: Map<string, string>, Url: string, DataUri: string): void {
	const NormalisedUrl = NormaliseUrl(Url);
	MapValue.set(NormalisedUrl, DataUri);

	if (Url.startsWith('https://')) {
		MapValue.set(NormaliseUrl(Url.substring(6)), DataUri);
	} else if (Url.startsWith('http://')) {
		MapValue.set(NormaliseUrl(Url.substring(5)), DataUri);
	}

	try {
		const DecodedUrl = decodeURIComponent(Url);
		if (DecodedUrl !== Url) {
			MapValue.set(NormaliseUrl(DecodedUrl), DataUri);
		}
	} catch {
	}

	const UrlParts = Url.split('/');
	const Filename = UrlParts[UrlParts.length - 1];
	if (Filename && Filename !== Url) {
		const CleanFilename = Filename.split('?')[0];
		MapValue.set(NormaliseUrl(CleanFilename), DataUri);
	}

	for (let Index = 1; Index < UrlParts.length - 1; Index++) {
		const SuffixPath = UrlParts.slice(Index).join('/');
		if (SuffixPath && SuffixPath !== Url) {
			MapValue.set(NormaliseUrl(SuffixPath), DataUri);
		}
	}
}

/**
 * Normalises a URL for consistent matching.
 * Strips query parameters, fragments, and size prefixes/suffixes.
 */
function NormaliseUrl(Url: string): string {
	let NormalisedUrl = Url.split('?')[0].split('#')[0];

	// Remove Wikimedia-style size prefixes/suffixes to broaden matching.
	NormalisedUrl = NormalisedUrl
		.replace(/(^|\/)\d+px-/, '$1')
		.replace(/-\d+px(?=\.[^.]+$)/, '');

	return NormalisedUrl.toLowerCase();
}

/**
 * Finds a matching data URI for a given HTML URL from the resource map.
 * Tries normalised, protocol-relative, percent-decoded, and filename-only matching.
 */
function FindResourceMatch(HtmlUrl: string, ResourceMap: Map<string, string>): string | null {
	if (HtmlUrl.startsWith('data:')) {
		return null;
	}

	const NormalisedHtmlUrl = NormaliseUrl(HtmlUrl);
	if (ResourceMap.has(NormalisedHtmlUrl)) {
		return ResourceMap.get(NormalisedHtmlUrl) ?? null;
	}

	if (HtmlUrl.startsWith('//')) {
		const UrlWithProtocol = NormaliseUrl(`https:${HtmlUrl}`);
		if (ResourceMap.has(UrlWithProtocol)) {
			return ResourceMap.get(UrlWithProtocol) ?? null;
		}
	}

	try {
		const DecodedHtmlUrl = NormaliseUrl(decodeURIComponent(HtmlUrl));
		if (DecodedHtmlUrl !== NormalisedHtmlUrl && ResourceMap.has(DecodedHtmlUrl)) {
			return ResourceMap.get(DecodedHtmlUrl) ?? null;
		}
	} catch {
	}

	const Filename = HtmlUrl.split('/').pop()?.split('?')[0];
	if (Filename) {
		const NormalisedFilename = NormaliseUrl(Filename);
		if (ResourceMap.has(NormalisedFilename)) {
			return ResourceMap.get(NormalisedFilename) ?? null;
		}
	}

	return null;
}

/**
 * Replaces resource URLs in HTML with data URIs.
 * Handles standard attributes, lazy-loading attributes, srcset variants, and CSS url().
 */
function ReplaceResourceUrls(Html: string, ResourceMap: Map<string, string>): string {
	let ReplacementCount = 0;

	Html = Html.replace(
		/(src|href|data-src|data-href|poster|xlink:href)\s*=\s*(["'])([^"']*)\2/gi,
		(Match, AttributeName: string, Quote: string, Url: string) => {
			const DataUri = FindResourceMatch(Url, ResourceMap);
			if (!DataUri) {
				return Match;
			}

			ReplacementCount++;
			return `${AttributeName}=${Quote}${DataUri}${Quote}`;
		}
	);

	Html = Html.replace(
		/(srcset|data-srcset)\s*=\s*(["'])([^"']*)\2/gi,
		(Match, AttributeName: string, Quote: string, SrcsetValue: string) => {
			let HadReplacement = false;
			const SrcsetParts = SrcsetValue.split(',').map((Part: string) => {
				const TrimmedPart = Part.trim();
				if (!TrimmedPart) {
					return TrimmedPart;
				}

				const Pieces = TrimmedPart.split(/\s+/);
				const Url = Pieces[0];
				const Descriptor = Pieces.slice(1).join(' ');
				const DataUri = FindResourceMatch(Url, ResourceMap);
				if (!DataUri) {
					return TrimmedPart;
				}

				HadReplacement = true;
				ReplacementCount++;
				return Descriptor ? `${DataUri} ${Descriptor}` : DataUri;
			});

			if (!HadReplacement) {
				return Match;
			}

			return `${AttributeName}=${Quote}${SrcsetParts.join(', ')}${Quote}`;
		}
	);

	Html = Html.replace(/url\(\s*(["']?)([^)"']*)\1\s*\)/gi, (Match, _Quote: string, Url: string) => {
		const DataUri = FindResourceMatch(Url, ResourceMap);
		if (!DataUri) {
			return Match;
		}

		ReplacementCount++;
		return `url("${DataUri}")`;
	});

	console.debug(`[WebArchive] Replaced ${ReplacementCount} resource URLs in HTML`);
	return Html;
}

/**
 * Injects CSS resources as inline <style> tags, replacing any matching link tags.
 * CSS content also has its own url() references replaced.
 */
function InjectCssResources(
	Html: string,
	CssResources: Array<{ Url: string; Content: string }>,
	ResourceMap: Map<string, string>
): string {
	if (CssResources.length === 0) {
		return Html;
	}

	let Result = Html;
	const UnmatchedCssBlocks: string[] = [];

	for (const { Url, Content: CssContent } of CssResources) {
		const ProcessedCss = CssContent.replace(
			/url\(\s*(["']?)([^)"']*)\1\s*\)/gi,
			(Match, _Quote: string, CssUrl: string) => {
				const DataUri = FindResourceMatch(CssUrl, ResourceMap);
				return DataUri ? `url("${DataUri}")` : Match;
			}
		);

		const EscapedUrl = Url.replace(/[.*+?^${}()|[\\\]]/g, '\\$&');
		const LinkTagPattern = new RegExp(
			`<link[^>]*?\\s+href=["']${EscapedUrl}["'][^>]*?>`,
			'gi'
		);

		if (LinkTagPattern.test(Result)) {
			LinkTagPattern.lastIndex = 0;
			Result = Result.replace(LinkTagPattern, `<style type="text/css">\n${ProcessedCss}\n</style>`);
			continue;
		}

		UnmatchedCssBlocks.push(`<style type="text/css">\n${ProcessedCss}\n</style>`);
	}

	if (UnmatchedCssBlocks.length > 0) {
		const CombinedCssBlocks = UnmatchedCssBlocks.join('\n');
		const HeadMatch = Result.match(/<head[^>]*>/i);

		if (HeadMatch) {
			const InsertPosition = Result.indexOf(HeadMatch[0]) + HeadMatch[0].length;
			Result =
				Result.substring(0, InsertPosition) +
				'\n' +
				CombinedCssBlocks +
				'\n' +
				Result.substring(InsertPosition);
		} else {
			const HtmlMatch = Result.match(/<html[^>]*>/i);
			if (HtmlMatch) {
				const InsertPosition = Result.indexOf(HtmlMatch[0]) + HtmlMatch[0].length;
				Result =
					Result.substring(0, InsertPosition) +
					`\n<head>\n${CombinedCssBlocks}\n</head>\n` +
					Result.substring(InsertPosition);
			}
		}
	}

	return Result;
}
