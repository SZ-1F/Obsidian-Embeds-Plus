import { ViewPlugin, ViewUpdate } from '@codemirror/view';
import { editorLivePreviewField as EditorLivePreviewField } from 'obsidian';
import { IsHtmlEmbedExtension } from './Constants';

export function CreateLivePreviewSuppressor() {
	return ViewPlugin.fromClass(
		class {
			update(Update: ViewUpdate): void {
				let IsLivePreview = false;
				try {
					IsLivePreview = Update.view.state.field(EditorLivePreviewField);
				} catch {
					return;
				}

				if (!IsLivePreview) {
					return;
				}

				// Find any native Obsidian embed elements that are NOT our widget
				// and hide them so our Decoration.replace widget is visible.
				const NativeEmbeds = Update.view.dom.querySelectorAll<HTMLElement>(
					'.internal-embed:not(.html-embed)'
				);

				for (const Embed of Array.from(NativeEmbeds)) {
					const Path = Embed.getAttribute('src') ?? Embed.getAttribute('alt') ?? '';
					const Extension = Path.split('.').pop()?.toLowerCase() ?? '';
					if (IsHtmlEmbedExtension(Extension)) {
						Embed.style.display = 'none';
					}
				}
			}
		}
	);
}
