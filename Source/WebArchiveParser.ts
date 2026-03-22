import { parse as ParsePlist } from '@plist/plist';
import { WebArchiveData, WebResource } from './Interfaces';
import { EnsureUint8Array, Uint8ArrayToBase64, Uint8ArrayToString } from './Utils';

/**
 * Parses a WebArchive file and extracts HTML content with embedded resources.
 */
export function ParseWebArchive(BinaryData: ArrayBuffer): string {
	try {
		const PlistData = ParsePlist(BinaryData) as WebArchiveData;
		if (!PlistData?.WebMainResource?.WebResourceData) {
			return '<html><body><p>Unable to parse WebArchive file.</p></body></html>';
		}

		const MainResourceData = EnsureUint8Array(PlistData.WebMainResource.WebResourceData);
		let HtmlContent = Uint8ArrayToString(MainResourceData);

		const AllResources = CollectAllResources(PlistData);
		const ResourceMap = new Map<string, string>();

		for (const Resource of AllResources) {
			if (!Resource.WebResourceURL || !Resource.WebResourceData || !Resource.WebResourceMIMEType) {
				continue;
			}

			const Data = EnsureUint8Array(Resource.WebResourceData);
			const Base64Data = Uint8ArrayToBase64(Data);
			const DataUri = `data:${Resource.WebResourceMIMEType};base64,${Base64Data}`;
			ResourceMap.set(NormaliseUrl(Resource.WebResourceURL), DataUri);
		}

		HtmlContent = ReplaceResourceUrls(HtmlContent, ResourceMap);
		HtmlContent = HtmlContent.replace(/<base[^>]*>/gi, '');
		return HtmlContent;
	} catch (ErrorValue) {
		return `<html><body><p>Error parsing WebArchive: ${ErrorValue instanceof Error ? ErrorValue.message : String(ErrorValue)}</p></body></html>`;
	}
}

function CollectAllResources(Archive: WebArchiveData): WebResource[] {
	const Resources: WebResource[] = [];

	if (Archive.WebSubresources) {
		Resources.push(...Archive.WebSubresources);
	}

	if (Archive.WebSubframeArchives) {
		for (const Subframe of Archive.WebSubframeArchives) {
			Resources.push(...CollectAllResources(Subframe));
		}
	}

	return Resources;
}

function NormaliseUrl(Url: string): string {
	return Url.split('?')[0].split('#')[0].toLowerCase();
}

function FindResourceMatch(HtmlUrl: string, ResourceMap: Map<string, string>): string | null {
	if (HtmlUrl.startsWith('data:')) {
		return null;
	}

	const NormalisedHtmlUrl = NormaliseUrl(HtmlUrl);
	if (ResourceMap.has(NormalisedHtmlUrl)) {
		return ResourceMap.get(NormalisedHtmlUrl) ?? null;
	}

	if (HtmlUrl.startsWith('//')) {
		const ProtocolUrl = NormaliseUrl(`https:${HtmlUrl}`);
		if (ResourceMap.has(ProtocolUrl)) {
			return ResourceMap.get(ProtocolUrl) ?? null;
		}
	}

	return null;
}

function ReplaceResourceUrls(Html: string, ResourceMap: Map<string, string>): string {
	Html = Html.replace(
		/(src|href|data-src|data-href|poster|xlink:href)\s*=\s*(["'])([^"']*)\2/gi,
		(Match, AttributeName: string, Quote: string, Url: string) => {
			const DataUri = FindResourceMatch(Url, ResourceMap);
			if (!DataUri) {
				return Match;
			}

			return `${AttributeName}=${Quote}${DataUri}${Quote}`;
		}
	);

	Html = Html.replace(/url\(\s*(["']?)([^)"']*)\1\s*\)/gi, (Match, _Quote: string, Url: string) => {
		const DataUri = FindResourceMatch(Url, ResourceMap);
		if (!DataUri) {
			return Match;
		}

		return `url("${DataUri}")`;
	});

	return Html;
}
