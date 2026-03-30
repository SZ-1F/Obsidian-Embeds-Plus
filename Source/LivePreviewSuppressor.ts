import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import {
	editorInfoField as EditorInfoField,
	editorLivePreviewField as EditorLivePreviewField,
} from 'obsidian';
import { HtmlCacheUpdateEffect } from './CodeMirrorExtensions';
import { IsHtmlEmbedExtension } from './Constants';
import { HTMLEmbedRenderer } from './HTMLEmbedRenderer';
import type HtmlViewerPlugin from './Main';


interface NativeHtmlEmbedState {
	Renderer: HTMLEmbedRenderer;
	FilePath: string;
	ContentHashValue: string;
}

const ProcessingMeasureKey = {};

export function CreateLivePreviewSuppressor(Plugin: HtmlViewerPlugin) {
	return ViewPlugin.fromClass(
		class {
			private readonly NativeHtmlEmbeds = new Map<HTMLElement, NativeHtmlEmbedState>();

			constructor(View: EditorView) {
				if (!IsLivePreviewEnabled(View)) {
					return;
				}

				this.QueueProcessing(View);
			}

			update(Update: ViewUpdate): void {
				if (!IsLivePreviewEnabled(Update.view)) {
					this.CleanupAllEmbeds();
					return;
				}

				const HasCacheUpdate = Update.transactions.some((TransactionValue: any) =>
					TransactionValue.effects.some((EffectValue: any) => EffectValue.is(HtmlCacheUpdateEffect))
				);

				if (
					!Update.docChanged &&
					!Update.selectionSet &&
					!Update.viewportChanged &&
					!Update.geometryChanged &&
					!HasCacheUpdate
				) {
					return;
				}

				this.QueueProcessing(Update.view);
			}

			docViewUpdate(View: EditorView): void {
				if (!IsLivePreviewEnabled(View)) {
					this.CleanupAllEmbeds();
					return;
				}

				this.QueueProcessing(View);
			}

			destroy(): void {
				this.CleanupAllEmbeds();
			}

			private QueueProcessing(View: EditorView): void {
				View.requestMeasure({
					key: ProcessingMeasureKey,
					read: () => null,
					write: () => {
						this.ProcessNativeEmbeds(View);
					},
				});
			}

			private ProcessNativeEmbeds(View: EditorView): void {
				if (!IsLivePreviewEnabled(View)) {
					this.CleanupAllEmbeds();
					return;
				}

				const SourcePath = GetSourcePath(View);
				if (!SourcePath) {
					this.CleanupMissingEmbeds(new Set());
					return;
				}

				const SeenEmbeds = new Set<HTMLElement>();
				const InternalEmbeds = View.dom.querySelectorAll('.internal-embed');

				for (const InternalEmbedValue of Array.from(InternalEmbeds)) {
					const Embed = InternalEmbedValue as HTMLElement;
					if (Embed.closest('.html-embed-widget')) {
						continue;
					}

					const Path = ResolveNativeEmbedPath(Embed);
					const Extension = Path.split('.').pop()?.toLowerCase() ?? '';
					if (!IsHtmlEmbedExtension(Extension)) {
						continue;
					}

					const File = Plugin.ResolveHtmlFile(Path, SourcePath);
					if (!File) {
						continue;
					}

					SeenEmbeds.add(Embed);

					const ContentHashValue = Plugin.HtmlHashCache.get(File.path) ?? 'loading';
					const ExistingEmbed = this.NativeHtmlEmbeds.get(Embed);
					const HasRenderedMarkup =
						Embed.classList.contains('html-embed') &&
						Embed.querySelector('.html-embed-iframe-container') !== null;

					if (
						ExistingEmbed &&
						ExistingEmbed.FilePath === File.path &&
						ExistingEmbed.ContentHashValue === ContentHashValue &&
						(ContentHashValue !== 'loading' || HasRenderedMarkup)
					) {
						continue;
					}

					ExistingEmbed?.Renderer.onunload();

					const Renderer = new HTMLEmbedRenderer(
						Embed,
						File,
						Plugin,
						'native-live-preview'
					);
					this.NativeHtmlEmbeds.set(Embed, {
						Renderer,
						FilePath: File.path,
						ContentHashValue,
					});

					void Renderer.onload();
				}

				this.CleanupMissingEmbeds(SeenEmbeds);
			}

			private CleanupMissingEmbeds(SeenEmbeds: Set<HTMLElement>): void {
				for (const [EmbedElement, EmbedState] of this.NativeHtmlEmbeds) {
					if (SeenEmbeds.has(EmbedElement) && EmbedElement.isConnected) {
						continue;
					}

					EmbedState.Renderer.onunload();
					this.NativeHtmlEmbeds.delete(EmbedElement);
				}
			}

			private CleanupAllEmbeds(): void {
				for (const EmbedState of this.NativeHtmlEmbeds.values()) {
					EmbedState.Renderer.onunload();
				}

				this.NativeHtmlEmbeds.clear();
			}
		}
	);
}

function IsLivePreviewEnabled(View: EditorView): boolean {
	try {
		return View.state.field(EditorLivePreviewField);
	} catch {
		return false;
	}
}

function GetSourcePath(View: EditorView): string | null {
	const EditorInfo = View.state.field(EditorInfoField, false);
	const CurrentFile = EditorInfo?.file;
	if (!CurrentFile) {
		return null;
	}

	return CurrentFile.path;
}

function ResolveNativeEmbedPath(Embed: HTMLElement): string {
	let FilePath = Embed.getAttribute('src') ?? Embed.getAttribute('alt');
	if (!FilePath) {
		const LinkElement = Embed.querySelector<HTMLElement>('a.internal-link');
		if (LinkElement) {
			FilePath = LinkElement.getAttribute('data-href') ?? LinkElement.getAttribute('href');
		}
	}

	return FilePath ?? '';
}
