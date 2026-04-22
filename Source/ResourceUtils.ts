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
const SrcsetDataCommaPlaceholder = '__EMBEDS_PLUS_DATA_COMMA__';

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

	findResource(HtmlUrl: string, BaseUrl?: string): ResourceEntry | null {
		const TrimmedHtmlUrl = HtmlUrl.trim();
		if (TrimmedHtmlUrl.startsWith('data:')) {
			return null;
		}

		const DirectEntry = this.FindResourceByUrl(TrimmedHtmlUrl);
		if (DirectEntry) {
			return DirectEntry;
		}

		const ResolvedUrl = ResolveUrlAgainstBase(TrimmedHtmlUrl, BaseUrl);
		if (!ResolvedUrl || ResolvedUrl === TrimmedHtmlUrl) {
			return null;
		}

		return this.FindResourceByUrl(ResolvedUrl);
	}

	private FindResourceByUrl(HtmlUrl: string): ResourceEntry | null {

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

// Rewrites archived resource references so the HTML can stand on its own.
export function ReplaceResourceUrls(
	Html: string,
	Index: ResourceIndex,
	BaseUrl?: string
): string {
	Html = Html.replace(
		/(src|href|data|data-src|data-href|poster|xlink:href)\s*=\s*(["'])([^"']*)\2/gi,
		(Match, AttributeName: string, Quote: string, Url: string) => {
			const Entry = Index.findResource(Url, BaseUrl);
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
			const SrcsetParts = SplitSrcsetCandidates(SrcsetValue).map((Part: string) => {
				const TrimmedPart = Part.trim();
				if (!TrimmedPart) {
					return TrimmedPart;
				}

				const Pieces = TrimmedPart.split(/\s+/);
				const Url = Pieces[0];
				const Descriptor = Pieces.slice(1).join(' ');
				const Entry = Index.findResource(Url, BaseUrl);
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
			const Entry = Index.findResource(Url, BaseUrl);
			if (!Entry) {
				return Match;
			}

			const DataUri = Index.getDataUri(Entry);
			return `url("${DataUri}")`;
		}
	);

	return Html;
}

// Inlines archived stylesheets so linked CSS is still available offline.
export function InjectCssResources(
	Html: string,
	Index: ResourceIndex,
	BaseUrl?: string
): string {
	const CssResources = Index.getCssResources();
	if (CssResources.length === 0) {
		return Html;
	}

	const LinkTagPattern = /<link[^\u003e]*?\s+href=["']([^"']*)["'][^\u003e]*?>/gi;
	const Matches: Array<{ FullMatch: string; Url: string; Entry: ResourceEntry }> = [];
	const MatchedCssUrls = new Set<string>();

	let Match;
	while ((Match = LinkTagPattern.exec(Html)) !== null) {
		const Url = Match[1];
		const Entry = Index.findResource(Url, BaseUrl);
		if (Entry?.CssContent) {
			Matches.push({ FullMatch: Match[0], Url, Entry });
			MatchedCssUrls.add(NormaliseUrl(Entry.Url));
		}
	}

	if (Matches.length === 0) {
		return InjectUnmatchedCss(Html, CssResources, Index);
	}

	let Result = Html;
	const UnmatchedCss: Array<{ Url: string; Content: string }> = [];

	for (const { Url, Entry } of Matches) {
		const ProcessedCss = ProcessCssContent(Entry.CssContent ?? '', Index, Entry.Url);

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
		const WasMatched = MatchedCssUrls.has(NormaliseUrl(Url));
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
		.map(
			({ Url, Content }) =>
				`<style type="text/css"\u003e\n${ProcessCssContent(Content, Index, Url)}\n</style>`
		)
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
	BaseUrl?: string,
	VisitedCssUrls: Set<string> = new Set()
): string {
	const ProcessedImports = CssContent.replace(
		/@import\s+(?:url\(\s*)?(["']?)([^"')\s;]+)\1\s*\)?[^;]*;/gi,
		(_ImportStatement, _Quote: string, ImportUrl: string) => {
			const ImportEntry = Index.findResource(ImportUrl, BaseUrl);
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
				ImportEntry.Url,
				VisitedCssUrls
			);
			return ImportedCss.length > 0 ? `${ImportedCss}\n` : '';
		}
	);

	return ProcessedImports.replace(
		/url\(\s*(["']?)([^)"']*)\1\s*\)/gi,
		(Match, _Quote: string, CssUrl: string) => {
			const RefEntry = Index.findResource(CssUrl, BaseUrl);
			if (!RefEntry) {
				return Match;
			}

			const DataUri = Index.getDataUri(RefEntry);
			return `url("${DataUri}")`;
		}
	);
}

function ResolveUrlAgainstBase(HtmlUrl: string, BaseUrl?: string): string | null {
	if (!BaseUrl || BaseUrl.length === 0) {
		return null;
	}

	const TrimmedUrl = HtmlUrl.trim();
	if (TrimmedUrl.length === 0) {
		return null;
	}

	if (TrimmedUrl.startsWith('data:') || TrimmedUrl.startsWith('cid:') || TrimmedUrl.startsWith('#')) {
		return null;
	}

	try {
		return new URL(TrimmedUrl, BaseUrl).href;
	} catch {
		return null;
	}
}

export function RemoveUnresolvedLocalResourceUrls(Html: string): string {
	Html = Html.replace(
		/(src|data|data-src|data-href|poster|xlink:href)\s*=\s*(["'])([^"']*)\2/gi,
		(Match, _AttributeName: string, _Quote: string, Url: string) => {
			if (!IsUnsafeUnresolvedResourceUrl(Url)) {
				return Match;
			}

			return '';
		}
	);

	Html = Html.replace(
		/(srcset|data-srcset)\s*=\s*(["'])([^"']*)\2/gi,
		(Match, AttributeName: string, Quote: string, SrcsetValue: string) => {
			const OriginalParts = SplitSrcsetCandidates(SrcsetValue);
			const FilteredParts = OriginalParts
				.map((Part: string) => Part.trim())
				.filter((Part: string) => {
					if (!Part) {
						return false;
					}

					const CandidateUrl = Part.split(/\s+/)[0];
					return !IsUnsafeUnresolvedResourceUrl(CandidateUrl);
				});

			if (FilteredParts.length === 0) {
				return '';
			}

			if (FilteredParts.length === OriginalParts.length) {
				return Match;
			}

			return `${AttributeName}=${Quote}${FilteredParts.join(', ')}${Quote}`;
		}
	);

	return Html.replace(
		/url\(\s*(["']?)([^)"']*)\1\s*\)/gi,
		(Match, _Quote: string, Url: string) => {
			if (!IsUnsafeUnresolvedResourceUrl(Url)) {
				return Match;
			}

			return 'url("data:,")';
		}
	);
}

function SplitSrcsetCandidates(SrcsetValue: string): string[] {
	const ProtectedSrcsetValue = SrcsetValue.replace(
		/(data:[^,\s]+;base64),/gi,
		`$1${SrcsetDataCommaPlaceholder}`
	);

	return ProtectedSrcsetValue
		.split(',')
		.map((Part) => Part.split(SrcsetDataCommaPlaceholder).join(','));
}

function IsUnsafeUnresolvedResourceUrl(Url: string): boolean {
	const TrimmedUrl = Url.trim();
	if (TrimmedUrl.length === 0) {
		return false;
	}

	const LowerUrl = TrimmedUrl.toLowerCase();
	if (
		LowerUrl.startsWith('data:') ||
		LowerUrl.startsWith('http://') ||
		LowerUrl.startsWith('https://') ||
		LowerUrl.startsWith('//') ||
		LowerUrl.startsWith('#')
	) {
		return false;
	}

	if (
		LowerUrl.startsWith('blob:') ||
		LowerUrl.startsWith('file:') ||
		LowerUrl.startsWith('app:') ||
		LowerUrl.startsWith('cid:')
	) {
		return true;
	}

	if (/^[a-z][a-z0-9+.-]*:/i.test(LowerUrl)) {
		return false;
	}

	return true;
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
