import { parse as ParsePlist } from '@plist/plist';
import { WebArchiveData, WebResource } from './Interfaces';
import { EnsureUint8Array, Uint8ArrayToString } from './Utils';
import {
	ResourceIndex,
	ReplaceResourceUrls,
	InjectCssResources,
	RemoveResidualLinkTags,
} from './ResourceUtils';

/**
 * Parses a WebArchive file and extracts the main HTML content with embedded resources.
 */
export function ParseWebArchive(BinaryData: ArrayBuffer): string {
	try {
		const PlistData = ParsePlist(BinaryData) as WebArchiveData;
		if (!PlistData) {
			return '<html><body><p>Unable to parse WebArchive file. The file may be corrupted.</p></body></html>';
		}

		const MainResource = PlistData.WebMainResource;
		if (!MainResource || !MainResource.WebResourceData) {
			return '<html><body><p>Unable to find main HTML content in WebArchive file.</p></body></html>';
		}

		const Index = new ResourceIndex();

		const AllResources = CollectAllResources(PlistData);
		for (const Resource of AllResources) {
			if (!Resource.WebResourceURL || !Resource.WebResourceData || !Resource.WebResourceMIMEType) {
				continue;
			}

			Index.addResource({
				Url: Resource.WebResourceURL,
				MimeType: Resource.WebResourceMIMEType,
				Data: EnsureUint8Array(Resource.WebResourceData),
				Encoding: ResolveTextEncoding(Resource),
			});
		}

		const MainResourceData = EnsureUint8Array(MainResource.WebResourceData);
		let HtmlContent = Uint8ArrayToString(
			MainResourceData,
			ResolveTextEncoding(MainResource)
		);

		HtmlContent = ReplaceResourceUrls(HtmlContent, Index);

		HtmlContent = InjectCssResources(HtmlContent, Index);

		// Remove link tags that cause blocked network/CSP noise.
		HtmlContent = RemoveResidualLinkTags(HtmlContent);

		// Remove base tags to prevent navigation issues.
		HtmlContent = HtmlContent.replace(/<base[^\u003e]*>/gi, '');

		return HtmlContent;
	} catch (ErrorValue) {
		return `<html><body><p>Error parsing WebArchive file: ${ErrorValue instanceof Error ? ErrorValue.message : String(ErrorValue)}</p></body></html>`;
	}
}

function ResolveTextEncoding(Resource: WebResource): string | undefined {
	if (Resource.WebResourceTextEncodingName) {
		return Resource.WebResourceTextEncodingName;
	}

	const MimeType = Resource.WebResourceMIMEType;
	if (!MimeType) {
		return undefined;
	}

	const CharsetMatch = MimeType.match(/charset\s*=\s*([^;]+)/i);
	return CharsetMatch?.[1]?.trim();
}

/**
 * Recursively collects all subresources from the archive.
 */
function CollectAllResources(Archive: WebArchiveData): WebResource[] {
	const Resources: WebResource[] = [];

	if (Archive.WebSubresources) {
		Resources.push(...Archive.WebSubresources);
	}

	// Recurse into subframe archives.
	if (Archive.WebSubframeArchives) {
		for (const Subframe of Archive.WebSubframeArchives) {
			Resources.push(...CollectAllResources(Subframe));
		}
	}

	return Resources;
}
