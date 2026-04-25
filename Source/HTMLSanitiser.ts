const AnimationOverrideCss = [
	'*, *::before, *::after { animation: none !important; transition: none !important; }',
	'marquee { display: block !important; overflow: hidden !important; }',
	'blink { text-decoration: none !important; }',
].join(' ');

const LinkAttributes = ['href', 'xlink:href'] as const;
const LinkHintRels = new Set(['preload', 'modulepreload', 'prefetch', 'prerender', 'preconnect', 'dns-prefetch']);
const LinkTagPattern = /<link\b[^\u003e]*>/gi;
const LinkRelPattern = /\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s\u003e]+))/i;
const SrcsetDataCommaPlaceholder = '__EMBEDS_PLUS_DATA_COMMA__';

export async function SanitiseHtml(Html: string): Promise<string> {
	const Parser = new DOMParser();
	const DocumentValue = Parser.parseFromString(Html, 'text/html');

	RemoveExecutableContent(DocumentValue);

	SanitiseAllElements(DocumentValue);

	await FreezeGifImages(DocumentValue);

	InjectAnimationOverride(DocumentValue);

	return DocumentValue.documentElement.outerHTML;
}

function RemoveExecutableContent(DocumentValue: Document): void {
	DocumentValue.querySelectorAll('script, meta[http-equiv]').forEach((ElementValue) => {
		if (
			ElementValue.tagName.toLowerCase() === 'meta' &&
			ElementValue.getAttribute('http-equiv')?.trim().toLowerCase() !== 'refresh'
		) {
			return;
		}

		ElementValue.remove();
	});
}

/**
 * Keeps link and media cleanup together so new rules are harder to miss.
 */
function SanitiseAllElements(DocumentValue: Document): void {
	const AllElements = Array.from(DocumentValue.querySelectorAll('*'));

	for (const ElementValue of AllElements) {
		if (SanitiseLinkHint(ElementValue)) {
			ElementValue.remove();
			continue;
		}

		for (const AttributeName of ElementValue.getAttributeNames()) {
			if (AttributeName.toLowerCase().startsWith('on')) {
				ElementValue.removeAttribute(AttributeName);
			}
		}

		ElementValue.removeAttribute('autofocus');

		for (const AttributeName of LinkAttributes) {
			const AttributeValue = ElementValue.getAttribute(AttributeName);
			if (AttributeValue && IsJavascriptUrl(AttributeValue)) {
				ElementValue.removeAttribute(AttributeName);
			}
		}

		if (ElementValue.tagName.toLowerCase() === 'a') {
			const Href = ElementValue.getAttribute('href') ?? '';

			if (/^https?:\/\//i.test(Href)) {
				ElementValue.setAttribute('target', '_blank');
				ElementValue.setAttribute('rel', 'noopener noreferrer');
			} else if (!/^mailto:/i.test(Href) && !/^tel:/i.test(Href)) {
				ElementValue.removeAttribute('href');
				ElementValue.removeAttribute('target');
				ElementValue.removeAttribute('rel');
			}
		}

		if (ElementValue.tagName.toLowerCase() === 'video' || ElementValue.tagName.toLowerCase() === 'audio') {
			ElementValue.removeAttribute('autoplay');
			ElementValue.removeAttribute('loop');
			ElementValue.setAttribute('preload', 'none');
		}

		if (
			ElementValue.tagName.toLowerCase() === 'animate' ||
			ElementValue.tagName.toLowerCase() === 'animatetransform' ||
			ElementValue.tagName.toLowerCase() === 'animatemotion' ||
			ElementValue.tagName.toLowerCase() === 'animatecolor' ||
			ElementValue.tagName.toLowerCase() === 'set'
		) {
			// Stop SMIL animations from starting.
			ElementValue.setAttribute('begin', 'indefinite');
		}
	}
}

async function FreezeGifImages(DocumentValue: Document): Promise<void> {
	const GifImages = Array.from(DocumentValue.querySelectorAll('img')).filter((Img) => {
		const Src = Img.getAttribute('src') ?? '';
		return /\.gif($|\?|#)/i.test(Src) || /^data:image\/gif/i.test(Src);
	});

	if (GifImages.length === 0) {
		return;
	}

	await Promise.all(
		GifImages.map((ImgElement) => {
			const Src = ImgElement.getAttribute('src') ?? '';
			if (!CanFreezeGifSource(Src)) {
				return Promise.resolve();
			}

			return new Promise<void>((Resolve) => {
				const Img = new Image();
				Img.onload = () => {
					try {
						const Canvas = activeDocument.createElement('canvas');
						Canvas.width = Img.naturalWidth;
						Canvas.height = Img.naturalHeight;
						const Ctx = Canvas.getContext('2d');
						if (Ctx && Canvas.width > 0 && Canvas.height > 0) {
							Ctx.drawImage(Img, 0, 0);
							ImgElement.setAttribute('src', Canvas.toDataURL('image/png'));
						}
					} catch {
						// Keep the original GIF source when export is blocked.
					}
					Resolve();
				};
				Img.onerror = () => Resolve();
				Img.src = Src;
			});
		})
	);
}

function CanFreezeGifSource(Src: string): boolean {
	return /^data:image\/gif/i.test(Src);
}

function InjectAnimationOverride(DocumentValue: Document): void {
	const StyleElement = DocumentValue.createElement('style');
	StyleElement.textContent = AnimationOverrideCss;

	if (DocumentValue.head) {
		DocumentValue.head.appendChild(StyleElement);
		return;
	}

	if (DocumentValue.body) {
		DocumentValue.body.appendChild(StyleElement);
		return;
	}

	DocumentValue.documentElement.appendChild(StyleElement);
}

function IsJavascriptUrl(Url: string): boolean {
	return Url.trim().toLowerCase().startsWith('javascript:');
}

function SanitiseLinkHint(ElementValue: Element): boolean {
	if (ElementValue.tagName.toLowerCase() !== 'link') {
		return false;
	}

	const RelValue = ElementValue.getAttribute('rel');
	if (!RelValue) {
		return false;
	}

	const RelTokens = ParseRelTokens(RelValue);
	const NonHintTokens = RelTokens.filter((Token) => !LinkHintRels.has(Token));
	if (NonHintTokens.length === RelTokens.length) {
		return false;
	}

	if (NonHintTokens.length === 0) {
		return true;
	}

	ElementValue.setAttribute('rel', NonHintTokens.join(' '));
	return false;
}

export function StripResourceHintLinks(Html: string): string {
	return Html.replace(LinkTagPattern, (LinkTag) => {
		const RelMatch = LinkTag.match(LinkRelPattern);
		if (!RelMatch) {
			return LinkTag;
		}

		const RelValue = RelMatch[1] ?? RelMatch[2] ?? RelMatch[3] ?? '';
		const RelTokens = ParseRelTokens(RelValue);
		const NonHintTokens = RelTokens.filter((Token) => !LinkHintRels.has(Token));

		if (NonHintTokens.length === RelTokens.length) {
			return LinkTag;
		}

		if (NonHintTokens.length === 0) {
			return '';
		}

		return LinkTag.replace(RelMatch[0], `rel="${NonHintTokens.join(' ')}"`);
	});
}

export function StripStylesheetLinks(Html: string): string {
	return Html.replace(LinkTagPattern, (LinkTag) => {
		const RelMatch = LinkTag.match(LinkRelPattern);
		if (!RelMatch) {
			return LinkTag;
		}

		const RelValue = RelMatch[1] ?? RelMatch[2] ?? RelMatch[3] ?? '';
		const RelTokens = ParseRelTokens(RelValue);
		return RelTokens.includes('stylesheet') ? '' : LinkTag;
	});
}

export function StripArchiveResidualResources(Html: string): string {
	const Parser = new DOMParser();
	const DocumentValue = Parser.parseFromString(Html, 'text/html');

	DocumentValue.querySelectorAll('link').forEach((LinkElement) => {
		LinkElement.remove();
	});

	for (const ElementValue of Array.from(DocumentValue.querySelectorAll('*'))) {
		SanitiseUrlAttribute(ElementValue, 'src');
		SanitiseUrlAttribute(ElementValue, 'poster');
		SanitiseUrlAttribute(ElementValue, 'data');
		SanitiseUrlAttribute(ElementValue, 'xlink:href');
		SanitiseHrefAttribute(ElementValue);
		SanitiseSrcsetAttribute(ElementValue, 'srcset');
		SanitiseSrcsetAttribute(ElementValue, 'data-srcset');
		SanitiseSrcsetAttribute(ElementValue, 'imagesrcset');
		SanitiseCssDeclarationAttribute(ElementValue, 'style');
	}

	DocumentValue.querySelectorAll('style').forEach((StyleElement) => {
		const CssContent = StyleElement.textContent;
		if (!CssContent) {
			return;
		}

		StyleElement.textContent = SanitiseCssUrlDeclarations(CssContent);
	});

	return DocumentValue.documentElement.outerHTML;
}

function SanitiseHrefAttribute(ElementValue: Element): void {
	const Href = ElementValue.getAttribute('href');
	if (!Href) {
		return;
	}

	const LowerTagName = ElementValue.tagName.toLowerCase();
	if (LowerTagName === 'a') {
		return;
	}

	if (IsUnsafeArchiveResourceUrl(Href)) {
		ElementValue.removeAttribute('href');
	}
}

function SanitiseUrlAttribute(ElementValue: Element, AttributeName: string): void {
	const AttributeValue = ElementValue.getAttribute(AttributeName);
	if (!AttributeValue) {
		return;
	}

	if (IsUnsafeArchiveResourceUrl(AttributeValue)) {
		ElementValue.removeAttribute(AttributeName);
	}
}

function SanitiseSrcsetAttribute(ElementValue: Element, AttributeName: string): void {
	const SrcsetValue = ElementValue.getAttribute(AttributeName);
	if (!SrcsetValue) {
		return;
	}

	const SanitisedCandidates = SplitSrcsetCandidates(SrcsetValue)
		.map((EntryValue) => EntryValue.trim())
		.filter((EntryValue) => {
			if (!EntryValue) {
				return false;
			}

			const CandidateUrl = EntryValue.split(/\s+/)[0];
			return !IsUnsafeArchiveResourceUrl(CandidateUrl);
		});

	if (SanitisedCandidates.length === 0) {
		ElementValue.removeAttribute(AttributeName);
		return;
	}

	ElementValue.setAttribute(AttributeName, SanitisedCandidates.join(', '));
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

function SanitiseCssDeclarationAttribute(ElementValue: Element, AttributeName: string): void {
	const CssValue = ElementValue.getAttribute(AttributeName);
	if (!CssValue) {
		return;
	}

	const SanitisedCssValue = SanitiseCssUrlDeclarations(CssValue);
	if (SanitisedCssValue !== CssValue) {
		ElementValue.setAttribute(AttributeName, SanitisedCssValue);
	}
}

function SanitiseCssUrlDeclarations(CssText: string): string {
	return CssText.replace(/url\(\s*(["']?)([^)"']*)\1\s*\)/gi, (Match, _Quote: string, Url: string) => {
		if (!IsUnsafeArchiveResourceUrl(Url)) {
			return Match;
		}

		return 'url("data:,")';
	});
}

function IsUnsafeArchiveResourceUrl(Url: string): boolean {
	const TrimmedUrl = Url.trim();
	if (TrimmedUrl.length === 0) {
		return false;
	}

	const LowerUrl = TrimmedUrl.toLowerCase();
	if (
		LowerUrl.startsWith('data:') ||
		LowerUrl.startsWith('http://') ||
		LowerUrl.startsWith('https://') ||
		LowerUrl.startsWith('mailto:') ||
		LowerUrl.startsWith('tel:') ||
		LowerUrl.startsWith('#')
	) {
		return false;
	}

	if (
		LowerUrl.startsWith('blob:') ||
		LowerUrl.startsWith('file:') ||
		LowerUrl.startsWith('app:') ||
		LowerUrl.startsWith('cid:') ||
		LowerUrl.startsWith('mw-data:') ||
		LowerUrl.startsWith('//')
	) {
		return true;
	}

	if (/^[a-z][a-z0-9+.-]*:/i.test(LowerUrl)) {
		return true;
	}

	return true;
}

function ParseRelTokens(RelValue: string): string[] {
	return RelValue
		.toLowerCase()
		.split(/\s+/)
		.filter((Token) => Token.length > 0);
}
