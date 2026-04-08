import { Uint8ArrayToBase64, Uint8ArrayToString } from './Utils';

export interface ResourceEntry {
	Url: string;
	MimeType: string;
	Data: Uint8Array;
	Encoding?: string;
	IsCss: boolean;
	CssContent?: string;
	DataUri?: string; 
}

const LinkTagPattern = /<link\b[^\u003e]*>/gi;
const LinkRelPattern = /\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s\u003e]+))/i;
const StylesheetRel = 'stylesheet';

/**
 * Stores archive resources in the forms needed for later lookup.
 */
export class ResourceIndex {
	private readonly ResourcesByUrl = new Map<string, ResourceEntry>();
	private readonly CssResources: Array<{ Url: string; Content: string }> = [];

	addResource(Raw: { Url: string; MimeType: string; Data: Uint8Array; Encoding?: string }): void {
		const { Url, MimeType, Data, Encoding } = Raw;
		const IsCss = MimeType === 'text/css';

		// CSS is decoded here because it is inlined later.
		let CssContent: string | undefined;
		if (IsCss) {
			CssContent = Uint8ArrayToString(Data, Encoding);
			this.CssResources.push({ Url, Content: CssContent });
		}

		const Entry: ResourceEntry = {
			Url,
			MimeType,
			Data,
			Encoding,
			IsCss,
			CssContent,
		};

		const NormalisedUrl = NormaliseUrl(Url);
		this.ResourcesByUrl.set(NormalisedUrl, Entry);

		if (Url.startsWith('https://')) {
			this.ResourcesByUrl.set(NormaliseUrl(Url.substring(6)), Entry);
		} else if (Url.startsWith('http://')) {
			this.ResourcesByUrl.set(NormaliseUrl(Url.substring(5)), Entry);
		}

		try {
			const DecodedUrl = decodeURIComponent(Url);
			if (DecodedUrl !== Url) {
				this.ResourcesByUrl.set(NormaliseUrl(DecodedUrl), Entry);
			}
		} catch {
		}

		const UrlParts = Url.split('/');
		const Filename = UrlParts[UrlParts.length - 1];
		if (Filename && Filename !== Url) {
			const CleanFilename = Filename.split('?')[0];
			this.ResourcesByUrl.set(NormaliseUrl(CleanFilename), Entry);
		}
	}

	findResource(HtmlUrl: string): ResourceEntry | null {
		if (HtmlUrl.startsWith('data:')) {
			return null;
		}

		const NormalisedHtmlUrl = NormaliseUrl(HtmlUrl);
		let Entry = this.ResourcesByUrl.get(NormalisedHtmlUrl);
		if (Entry) {
			return Entry;
		}

		if (HtmlUrl.startsWith('//')) {
			Entry = this.ResourcesByUrl.get(NormaliseUrl(`https:${HtmlUrl}`));
			if (Entry) {
				return Entry;
			}
		}

		try {
			const DecodedHtmlUrl = NormaliseUrl(decodeURIComponent(HtmlUrl));
			if (DecodedHtmlUrl !== NormalisedHtmlUrl) {
				Entry = this.ResourcesByUrl.get(DecodedHtmlUrl);
				if (Entry) {
					return Entry;
				}
			}
		} catch {
		}

		const Filename = HtmlUrl.split('/').pop()?.split('?')[0];
		if (Filename) {
			Entry = this.ResourcesByUrl.get(NormaliseUrl(Filename));
			if (Entry) {
				return Entry;
			}
		}

		// Try path suffixes only after direct matches fail.
		const UrlParts = HtmlUrl.split('/');
		for (let Index = 1; Index < UrlParts.length - 1; Index++) {
			const SuffixPath = UrlParts.slice(Index).join('/');
			if (SuffixPath) {
				Entry = this.ResourcesByUrl.get(NormaliseUrl(SuffixPath));
				if (Entry) {
					return Entry;
				}
			}
		}

		return null;
	}

	getDataUri(Entry: ResourceEntry): string {
		if (Entry.DataUri !== undefined) {
			return Entry.DataUri;
		}

		// Only build the data URI if this resource is actually used.
		const Base64Data = Uint8ArrayToBase64(Entry.Data);
		Entry.DataUri = `data:${Entry.MimeType};base64,${Base64Data}`;
		return Entry.DataUri;
	}

	getCssResources(): Array<{ Url: string; Content: string }> {
		return this.CssResources;
	}
}

/**
 * Normalises a URL for consistent matching.
 * Strips query parameters, fragments, and size prefixes/suffixes.
 */
export function NormaliseUrl(Url: string): string {
	let NormalisedUrl = Url.split('?')[0].split('#')[0];

	// Remove Wikimedia-style size prefixes/suffixes.
	NormalisedUrl = NormalisedUrl
		.replace(/(^|\/)\d+px-/, '$1')
		.replace(/-\d+px(?=\.[^.]+$)/, '');

	return NormalisedUrl.toLowerCase();
}

/**
 * Rewrites archived resource references so the HTML can stand on its own.
 */
export function ReplaceResourceUrls(Html: string, Index: ResourceIndex): string {
	Html = Html.replace(
		/(src|href|data-src|data-href|poster|xlink:href)\s*=\s*(["'])([^"']*)\2/gi,
		(Match, AttributeName: string, Quote: string, Url: string) => {
			const Entry = Index.findResource(Url);
			if (!Entry) {
				return Match;
			}

			const DataUri = Index.getDataUri(Entry);
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
				const Entry = Index.findResource(Url);
				if (!Entry) {
					return TrimmedPart;
				}

				HadReplacement = true;
				const DataUri = Index.getDataUri(Entry);
				return Descriptor ? `${DataUri} ${Descriptor}` : DataUri;
			});

			if (!HadReplacement) {
				return Match;
			}

			return `${AttributeName}=${Quote}${SrcsetParts.join(', ')}${Quote}`;
		}
	);

	Html = Html.replace(
		/url\(\s*(["']?)([^)"']*)\1\s*\)/gi,
		(Match, _Quote: string, Url: string) => {
			const Entry = Index.findResource(Url);
			if (!Entry) {
				return Match;
			}

			const DataUri = Index.getDataUri(Entry);
			return `url("${DataUri}")`;
		}
	);

	return Html;
}

/**
 * Inlines archived stylesheets so linked CSS is still available offline.
 */
export function InjectCssResources(Html: string, Index: ResourceIndex): string {
	const CssResources = Index.getCssResources();
	if (CssResources.length === 0) {
		return Html;
	}

	// Normalise CSS URLs up front before scanning link tags.
	const CssUrlSet = new Set(CssResources.map((r) => NormaliseUrl(r.Url)));

	const LinkTagPattern = /<link[^\u003e]*?\s+href=["']([^"']*)["'][^\u003e]*?>/gi;
	const Matches: Array<{ FullMatch: string; Url: string }> = [];

	let Match;
	while ((Match = LinkTagPattern.exec(Html)) !== null) {
		const Url = Match[1];
		if (CssUrlSet.has(NormaliseUrl(Url))) {
			Matches.push({ FullMatch: Match[0], Url });
		}
	}

	if (Matches.length === 0) {
		return InjectUnmatchedCss(Html, CssResources, Index);
	}

	let Result = Html;
	const UnmatchedCss: Array<{ Url: string; Content: string }> = [];

	for (const { Url } of Matches) {
		const Entry = Index.findResource(Url);
		if (!Entry?.CssContent) {
			continue;
		}

		const ProcessedCss = ProcessCssContent(Entry.CssContent, Index);

		const EscapedUrl = Url.replace(/[.*+?^${}()|[\\\]]/g, '\\$&');
		const SpecificPattern = new RegExp(
			`<link[^\u003e]*?\\s+href=["']${EscapedUrl}["'][^\u003e]*?>`,
			'gi'
		);
		Result = Result.replace(
			SpecificPattern,
			`<style type="text/css"\u003e\n${ProcessedCss}\n</style>`
		);
	}

	for (const { Url, Content } of CssResources) {
		const WasMatched = Matches.some((m) => NormaliseUrl(m.Url) === NormaliseUrl(Url));
		if (!WasMatched) {
			UnmatchedCss.push({ Url, Content });
		}
	}

	if (UnmatchedCss.length > 0) {
		Result = InjectUnmatchedCss(Result, UnmatchedCss, Index);
	}

	return Result;
}

function InjectUnmatchedCss(
	Html: string,
	CssResources: Array<{ Url: string; Content: string }>,
	Index: ResourceIndex
): string {
	const CombinedCssBlocks = CssResources
		.map(({ Content }) => `<style type="text/css"\u003e\n${ProcessCssContent(Content, Index)}\n</style>`)
		.join('\n');

	const HeadMatch = Html.match(/<head[^\u003e]*>/i);
	if (HeadMatch) {
		const InsertPosition = Html.indexOf(HeadMatch[0]) + HeadMatch[0].length;
		return (
			Html.substring(0, InsertPosition) +
			'\n' +
			CombinedCssBlocks +
			'\n' +
			Html.substring(InsertPosition)
		);
	}

	const HtmlMatch = Html.match(/<html[^\u003e]*>/i);
	if (HtmlMatch) {
		const InsertPosition = Html.indexOf(HtmlMatch[0]) + HtmlMatch[0].length;
		return (
			Html.substring(0, InsertPosition) +
			`\n<head>\n${CombinedCssBlocks}\n</head>\n` +
			Html.substring(InsertPosition)
		);
	}

	// Insert styles inside the body if there is no head element.
	const BodyMatch = Html.match(/<body[^\u003e]*>/i);
	if (BodyMatch) {
		const InsertPosition = Html.indexOf(BodyMatch[0]) + BodyMatch[0].length;
		return (
			Html.substring(0, InsertPosition) +
			'\n' +
			CombinedCssBlocks +
			'\n' +
			Html.substring(InsertPosition)
		);
	}

	return CombinedCssBlocks + '\n' + Html;
}

function ProcessCssContent(
	CssContent: string,
	Index: ResourceIndex,
	VisitedCssUrls: Set<string> = new Set()
): string {
	const ProcessedImports = CssContent.replace(
		/@import\s+(?:url\(\s*)?(["']?)([^"')\s;]+)\1\s*\)?[^;]*;/gi,
		(_ImportStatement, _Quote: string, ImportUrl: string) => {
			const ImportEntry = Index.findResource(ImportUrl);
			if (!ImportEntry?.CssContent) {
				return '';
			}

			const ImportKey = NormaliseUrl(ImportEntry.Url);
			if (VisitedCssUrls.has(ImportKey)) {
				return '';
			}

			VisitedCssUrls.add(ImportKey);

			const ImportedCss = ProcessCssContent(
				ImportEntry.CssContent,
				Index,
				VisitedCssUrls
			);
			return ImportedCss.length > 0 ? `${ImportedCss}\n` : '';
		}
	);

	return ProcessedImports.replace(
		/url\(\s*(["']?)([^)"']*)\1\s*\)/gi,
		(Match, _Quote: string, CssUrl: string) => {
			const RefEntry = Index.findResource(CssUrl);
			if (!RefEntry) {
				return Match;
			}

			const DataUri = Index.getDataUri(RefEntry);
			return `url("${DataUri}")`;
		}
	);
}

export function RemoveResidualLinkTags(Html: string): string {
	return Html.replace(LinkTagPattern, (LinkTag) => {
		const RelMatch = LinkTag.match(LinkRelPattern);
		if (!RelMatch) {
			return LinkTag;
		}

		const RelValue = RelMatch[1] ?? RelMatch[2] ?? RelMatch[3] ?? '';
		const RelTokens = RelValue
			.toLowerCase()
			.split(/\s+/)
			.filter((Token) => Token.length > 0);

		if (RelTokens.includes(StylesheetRel)) {
			return '';
		}

		return LinkTag;
	});
}
