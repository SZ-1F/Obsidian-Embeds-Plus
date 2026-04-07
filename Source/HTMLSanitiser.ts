const AnimationOverrideCss =
	'*, *::before, *::after { animation: none !important; transition: none !important; }';

const LinkAttributes = ['href', 'xlink:href'] as const;

export function SanitiseHtml(Html: string): string {
	const Parser = new DOMParser();
	const DocumentValue = Parser.parseFromString(Html, 'text/html');

	RemoveExecutableContent(DocumentValue);
	SanitiseLinks(DocumentValue);
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
