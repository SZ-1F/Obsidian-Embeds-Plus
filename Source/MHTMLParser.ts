import { Uint8ArrayToString } from './Utils';
import {
	ResourceIndex,
	ReplaceResourceUrls,
	InjectCssResources,
	RemoveResidualLinkTags,
} from './ResourceUtils';

interface MimePart {
	Headers: Map<string, string>;
	RawBody: string;
}

/**
 * Parses an MHTML file and extracts the main HTML content with embedded resources.
 */
export function ParseMHTML(Content: string): string {
	try {
		const CrLfSplit = Content.indexOf('\r\n\r\n');
		const LfSplit = Content.indexOf('\n\n');
		const UseCrLf = CrLfSplit !== -1 && (LfSplit === -1 || CrLfSplit <= LfSplit);
		const SplitPos = UseCrLf ? CrLfSplit : LfSplit;
		const Separator = UseCrLf ? '\r\n\r\n' : '\n\n';

		if (SplitPos === -1) {
			return ErrorHtml('Could not find MIME headers in MHTML file.');
		}

		const RawOuterHeaders = Content.substring(0, SplitPos);
		const Body = Content.substring(SplitPos + Separator.length);

		const OuterHeaders = ParseMimeHeaders(UnfoldHeaders(RawOuterHeaders));
		const ContentType = OuterHeaders.get('content-type') ?? '';
		const Boundary = ExtractHeaderParam(ContentType, 'boundary');
		if (!Boundary) {
			return ErrorHtml('Could not find MIME boundary in MHTML file.');
		}

		const RawParts = SplitParts(Body, Boundary);
		if (!RawParts || RawParts.length === 0) {
			return ErrorHtml('No MIME parts found in MHTML file.');
		}

		const Parts = RawParts.map(ParseMimePart);

		const MainIndex = FindMainPartIndex(Parts, OuterHeaders);
		const MainPart = Parts[MainIndex];

		const MainTransferEncoding = (MainPart.Headers.get('content-transfer-encoding') ?? '7bit').trim().toLowerCase();
		const MainBytes = DecodeMimeBody(MainPart.RawBody, MainTransferEncoding);
		const MainCharset = ExtractCharsetFromContentType(MainPart.Headers.get('content-type') ?? '') ?? 'utf-8';
		let HtmlContent = Uint8ArrayToString(MainBytes, MainCharset);

		const Index = new ResourceIndex();
		for (let I = 0; I < Parts.length; I++) {
			if (I === MainIndex) {
				continue;
			}
			AddPartToIndex(Parts[I], Index);
		}

		// Reuse the WebArchive resource inlining steps.
		HtmlContent = ReplaceResourceUrls(HtmlContent, Index);
		HtmlContent = InjectCssResources(HtmlContent, Index);
		HtmlContent = RemoveResidualLinkTags(HtmlContent);
		HtmlContent = HtmlContent.replace(/<base[^\u003e]*>/gi, '');

		return HtmlContent;
	} catch (ErrorValue) {
		return ErrorHtml(`Error parsing MHTML file: ${ErrorValue instanceof Error ? ErrorValue.message : String(ErrorValue)}`);
	}
}

/**
 * Joins continuation lines per RFC 2822 header folding rules.
 */
function UnfoldHeaders(RawHeaderBlock: string): string {
	return RawHeaderBlock.replace(/\r?\n[ \t]+/g, ' ');
}

/**
 * Parses a MIME header block into a map of lowercase name to raw value.
 */
function ParseMimeHeaders(HeaderBlock: string): Map<string, string> {
	const Headers = new Map<string, string>();
	const Lines = HeaderBlock.split(/\r?\n/);

	for (const Line of Lines) {
		const ColonIndex = Line.indexOf(':');
		if (ColonIndex === -1) {
			continue;
		}

		const Name = Line.substring(0, ColonIndex).trim().toLowerCase();
		const Value = Line.substring(ColonIndex + 1).trim();
		if (Name) {
			Headers.set(Name, Value);
		}
	}

	return Headers;
}

/**
 * Extracts a named parameter from a MIME header, supporting both quoted and unquoted values.
 */
function ExtractHeaderParam(HeaderValue: string, ParamName: string): string | null {
	const Pattern = new RegExp(`\\b${ParamName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s;,]+))`, 'i');
	const Match = HeaderValue.match(Pattern);
	if (!Match) {
		return null;
	}

	return Match[1] ?? Match[2] ?? Match[3] ?? null;
}

/**
 * Splits the MHTML body into individual MIME part strings, tolerating both \r\n and \n line endings.
 */
function SplitParts(Body: string, Boundary: string): string[] | null {
	const OpenDelimiter = `--${Boundary}`;
	const CloseDelimiter = `--${Boundary}--`;
	const Parts: string[] = [];

	let SearchFrom = 0;

	while (true) {
		const DelimiterPos = Body.indexOf(OpenDelimiter, SearchFrom);
		if (DelimiterPos === -1) {
			break;
		}

		const AfterDelimiter = DelimiterPos + OpenDelimiter.length;
		if (Body.startsWith('--', AfterDelimiter)) {
			break;
		}

		let PartStart = AfterDelimiter;
		if (Body[PartStart] === '\r') {
			PartStart++;
		}
		if (Body[PartStart] === '\n') {
			PartStart++;
		}

		const NextDelimiterPos = Body.indexOf(`\n--${Boundary}`, PartStart);
		if (NextDelimiterPos === -1) {
			const ClosePos = Body.indexOf(CloseDelimiter, PartStart);
			const PartEnd = ClosePos !== -1 ? ClosePos : Body.length;

			const RawPart = Body.substring(PartStart, PartEnd).replace(/\r?\n$/, '');
			Parts.push(RawPart);
			break;
		}

		const PartEnd =
			NextDelimiterPos > PartStart && Body[NextDelimiterPos - 1] === '\r'
				? NextDelimiterPos - 1
				: NextDelimiterPos;

		Parts.push(Body.substring(PartStart, PartEnd));

		SearchFrom = NextDelimiterPos + 1;
	}

	return Parts.length > 0 ? Parts : null;
}

/**
 * Splits a raw MIME part string into its headers and body.
 */
function ParseMimePart(RawPart: string): MimePart {
	const CrLfSplit = RawPart.indexOf('\r\n\r\n');
	const LfSplit = RawPart.indexOf('\n\n');
	const UseCrLf = CrLfSplit !== -1 && (LfSplit === -1 || CrLfSplit <= LfSplit);
	const SplitPos = UseCrLf ? CrLfSplit : LfSplit;
	const Separator = UseCrLf ? '\r\n\r\n' : '\n\n';

	if (SplitPos === -1) {
		// Some parts omit the blank line separator, so treat them as header-only.
		return {
			Headers: ParseMimeHeaders(UnfoldHeaders(RawPart)),
			RawBody: '',
		};
	}

	const RawHeaders = RawPart.substring(0, SplitPos);
	const RawBody = RawPart.substring(SplitPos + Separator.length);

	return {
		Headers: ParseMimeHeaders(UnfoldHeaders(RawHeaders)),
		RawBody,
	};
}

/**
 * Decodes a MIME part body to a Uint8Array based on its Content-Transfer-Encoding.
 */
function DecodeMimeBody(RawBody: string, TransferEncoding: string): Uint8Array {
	if (TransferEncoding === 'base64') {
		// Chrome wraps long base64 lines, so strip whitespace before decoding.
		const CleanBase64 = RawBody.replace(/\s+/g, '');
		const BinaryString = atob(CleanBase64);
		const Bytes = new Uint8Array(BinaryString.length);
		for (let I = 0; I < BinaryString.length; I++) {
			Bytes[I] = BinaryString.charCodeAt(I);
		}
		return Bytes;
	}

	if (TransferEncoding === 'quoted-printable') {
		return DecodeQuotedPrintable(RawBody);
	}

	// `vault.read()` has already decoded the remaining transfer encodings.
	return new TextEncoder().encode(RawBody);
}

/**
 * Decodes a quoted-printable encoded string to a Uint8Array.
 */
function DecodeQuotedPrintable(Input: string): Uint8Array {
	const WithoutSoftBreaks = Input.replace(/=\r?\n/g, '');

	const Bytes: number[] = [];
	let Index = 0;

	while (Index < WithoutSoftBreaks.length) {
		if (WithoutSoftBreaks[Index] === '=' && Index + 2 < WithoutSoftBreaks.length) {
			const Hex = WithoutSoftBreaks.substring(Index + 1, Index + 3);
			const Byte = parseInt(Hex, 16);
			if (!isNaN(Byte)) {
				Bytes.push(Byte);
				Index += 3;
				continue;
			}
		}
		Bytes.push(WithoutSoftBreaks.charCodeAt(Index));
		Index++;
	}

	return new Uint8Array(Bytes);
}

/**
 * Extracts the charset value from a Content-Type header value.
 */
function ExtractCharsetFromContentType(ContentType: string): string | undefined {
	const Match = ContentType.match(/charset\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s;]+))/i);
	return Match ? (Match[1] ?? Match[2] ?? Match[3]) : undefined;
}

/**
 * Finds the index of the main HTML part, preferring the start= content ID if present.
 */
function FindMainPartIndex(Parts: MimePart[], OuterHeaders: Map<string, string>): number {
	const ContentType = OuterHeaders.get('content-type') ?? '';
	const StartCid = ExtractHeaderParam(ContentType, 'start');

	if (StartCid) {
		const NormalisedCid = StartCid.replace(/^<|>$/g, '');
		const MatchIndex = Parts.findIndex((Part) => {
			const Cid = (Part.Headers.get('content-id') ?? '').replace(/^<|>$/g, '');
			return Cid === NormalisedCid;
		});
		if (MatchIndex !== -1) {
			return MatchIndex;
		}
	}

	// Use the first HTML part if the start= content ID does not resolve.
	const HtmlIndex = Parts.findIndex((Part) =>
		(Part.Headers.get('content-type') ?? '').toLowerCase().startsWith('text/html')
	);

	return HtmlIndex !== -1 ? HtmlIndex : 0;
}

/**
 * Decodes a MIME part and registers it in the resource index by Content-Location and Content-ID.
 */
function AddPartToIndex(Part: MimePart, Index: ResourceIndex): void {
	const ContentLocation = Part.Headers.get('content-location');
	const ContentId = Part.Headers.get('content-id')?.replace(/^<|>$/g, '');

	// Prefer the original resource location when the archive provides one.
	const Url = ContentLocation ?? (ContentId ? `cid:${ContentId}` : null);
	if (!Url) {
		return;
	}

	const ContentType = Part.Headers.get('content-type') ?? 'application/octet-stream';
	const MimeType = ContentType.split(';')[0].trim();
	const TransferEncoding = (Part.Headers.get('content-transfer-encoding') ?? '7bit').trim().toLowerCase();
	const Data = DecodeMimeBody(Part.RawBody, TransferEncoding);
	const Encoding = ExtractCharsetFromContentType(ContentType);

	Index.addResource({ Url, MimeType, Data, Encoding });

	// Also register the bare content ID because some references omit the cid: prefix.
	if (!ContentLocation && ContentId) {
		Index.addResource({ Url: ContentId, MimeType, Data, Encoding });
	}
}

function ErrorHtml(Message: string): string {
	return `<html><body><p>${Message}</p></body></html>`;
}
