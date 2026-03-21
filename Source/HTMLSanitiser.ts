export function SanitiseHtml(Html: string): string {
	Html = Html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi, '');
	Html = Html.replace(/<script\b[^>]*\/\s*>/gi, '');

	Html = Html.replace(/(<[^>]*?)\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '$1');

	Html = Html.replace(
		/(<a\b[^>]*?\bhref\s*=\s*)(["'])javascript:[^"']*\2/gi,
		'$1$2$2'
	);

	// Keep external links working, but block links that would navigate inside the embed.
	Html = Html.replace(/<a\b([^>]*)>/gi, (Match, Attrs: string) => {
		const HrefMatch = Attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
		const Href = HrefMatch ? (HrefMatch[1] ?? HrefMatch[2] ?? '') : '';

		if (/^https?:\/\//i.test(Href)) {
			const CleanAttrs = Attrs
				.replace(/\btarget\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
				.replace(/\brel\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
			return `<a${CleanAttrs} target="_blank" rel="noopener noreferrer">`;
		}

		if (/^mailto:/i.test(Href) || /^tel:/i.test(Href)) {
			return Match;
		}

		const StrippedAttrs = Attrs.replace(/\bhref\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
		return `<a${StrippedAttrs}>`;
	});

	const AnimationOverride =
		'<style>*, *::before, *::after { animation: none !important; transition: none !important; }</style>';

	if (/<\/head\s*>/i.test(Html)) {
		Html = Html.replace(/<\/head\s*>/i, `${AnimationOverride}</head>`);
	} else if (/<\/body\s*>/i.test(Html)) {
		Html = Html.replace(/<\/body\s*>/i, `${AnimationOverride}</body>`);
	} else {
		Html += AnimationOverride;
	}

	return Html;
}
