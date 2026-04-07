const AnimationOverrideCss = [
	'*, *::before, *::after { animation: none !important; transition: none !important; }',
	'marquee { display: block !important; overflow: hidden !important; }',
	'blink { text-decoration: none !important; }',
].join(' ');

const LinkAttributes = ['href', 'xlink:href'] as const;

export async function SanitiseHtml(Html: string): Promise<string> {
	const Parser = new DOMParser();
	const DocumentValue = Parser.parseFromString(Html, 'text/html');

	RemoveExecutableContent(DocumentValue);
	SanitiseLinks(DocumentValue);
	FreezeMediaElements(DocumentValue);
	FreezeAnimatedSvg(DocumentValue);
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

	DocumentValue.querySelectorAll('*').forEach((ElementValue) => {
		for (const AttributeName of ElementValue.getAttributeNames()) {
			if (AttributeName.toLowerCase().startsWith('on')) {
				ElementValue.removeAttribute(AttributeName);
			}
		}
	});
}

function SanitiseLinks(DocumentValue: Document): void {
	DocumentValue.querySelectorAll('*').forEach((ElementValue) => {
		for (const AttributeName of LinkAttributes) {
			const AttributeValue = ElementValue.getAttribute(AttributeName);
			if (!AttributeValue) {
				continue;
			}

			if (IsJavascriptUrl(AttributeValue)) {
				ElementValue.removeAttribute(AttributeName);
			}
		}
	});

	DocumentValue.querySelectorAll('a').forEach((AnchorElement) => {
		const Href = AnchorElement.getAttribute('href') ?? '';

		if (/^https?:\/\//i.test(Href)) {
			AnchorElement.setAttribute('target', '_blank');
			AnchorElement.setAttribute('rel', 'noopener noreferrer');
			return;
		}

		if (/^mailto:/i.test(Href) || /^tel:/i.test(Href)) {
			return;
		}

		AnchorElement.removeAttribute('href');
		AnchorElement.removeAttribute('target');
		AnchorElement.removeAttribute('rel');
	});
}

function FreezeMediaElements(DocumentValue: Document): void {
	DocumentValue.querySelectorAll('video, audio').forEach((MediaElement) => {
		MediaElement.removeAttribute('autoplay');
		MediaElement.removeAttribute('loop');
		MediaElement.setAttribute('preload', 'none');
	});
}

function FreezeAnimatedSvg(DocumentValue: Document): void {
	// Stop SMIL animations from starting.
	DocumentValue.querySelectorAll('animate, animateTransform, animateMotion, animateColor, set').forEach(
		(AnimationElement) => {
			AnimationElement.setAttribute('begin', 'indefinite');
		},
	);
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
