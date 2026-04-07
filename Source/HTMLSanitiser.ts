const AnimationOverrideCss = [
	'*, *::before, *::after { animation: none !important; transition: none !important; }',
	'marquee { display: block !important; overflow: hidden !important; }',
	'blink { text-decoration: none !important; }',
].join(' ');

const LinkAttributes = ['href', 'xlink:href'] as const;
const LinkHintRels = new Set(['preload', 'modulepreload', 'prefetch', 'prerender', 'preconnect', 'dns-prefetch']);
const LinkTagPattern = /<link\b[^\u003e]*>/gi;
const LinkRelPattern = /\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s\u003e]+))/i;

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
			return new Promise<void>((Resolve) => {
				const Img = new Image();
				Img.onload = () => {
					const Canvas = document.createElement('canvas');
					Canvas.width = Img.naturalWidth;
					Canvas.height = Img.naturalHeight;
					const Ctx = Canvas.getContext('2d');
					if (Ctx && Canvas.width > 0 && Canvas.height > 0) {
						Ctx.drawImage(Img, 0, 0);
						ImgElement.setAttribute('src', Canvas.toDataURL('image/png'));
					}
					Resolve();
				};
				Img.onerror = () => Resolve();
				Img.src = Src;
			});
		})
	);
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

function ParseRelTokens(RelValue: string): string[] {
	return RelValue
		.toLowerCase()
		.split(/\s+/)
		.filter((Token) => Token.length > 0);
}
