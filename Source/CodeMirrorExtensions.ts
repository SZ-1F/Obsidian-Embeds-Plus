import { EditorState, Extension, Prec, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import {
	editorInfoField as EditorInfoField,
	editorLivePreviewField as EditorLivePreviewField,
} from 'obsidian';
import { HTMLEmbedWidget } from './HTMLEmbedWidget';
import type HtmlViewerPlugin from './Main';
import { CreateHtmlEmbedRegex } from './Utils';

export const HtmlCacheUpdateEffect = StateEffect.define<string>();

const CachedEmbedRegex = CreateHtmlEmbedRegex();

function ResetEmbedRegex(): RegExp {
	CachedEmbedRegex.lastIndex = 0;
	return CachedEmbedRegex;
}

export function CreateHtmlEmbedStateField(Plugin: HtmlViewerPlugin): Extension {
	const HtmlEmbedField = StateField.define<DecorationSet>({
		create(State): DecorationSet {
			let IsLivePreview = false;
			try {
				IsLivePreview = State.field(EditorLivePreviewField);
			} catch {
				return Decoration.none;
			}

			if (!IsLivePreview) {
				return Decoration.none;
			}

			return BuildHtmlEmbedDecorations(State, Plugin);
		},

		update(Decorations, TransactionValue): DecorationSet {
			let IsLivePreview = false;
			try {
				IsLivePreview = TransactionValue.state.field(EditorLivePreviewField);
			} catch {
				return Decoration.none;
			}

			if (!IsLivePreview) {
				return Decoration.none;
			}

			const HasCacheUpdate = TransactionValue.effects.some((EffectValue) =>
				EffectValue.is(HtmlCacheUpdateEffect)
			);

			if (TransactionValue.docChanged || HasCacheUpdate) {
				return BuildHtmlEmbedDecorations(TransactionValue.state, Plugin);
			}

			return Decorations.map(TransactionValue.changes);
		},

		provide(Field): Extension {
			return EditorView.decorations.from(Field);
		},
	});

	return Prec.highest(HtmlEmbedField);
}

function BuildHtmlEmbedDecorations(State: EditorState, Plugin: HtmlViewerPlugin): DecorationSet {
	try {
		const EditorInfo = State.field(EditorInfoField, false);
		const CurrentFile = EditorInfo?.file;
		if (!CurrentFile) {
			return Decoration.none;
		}

		const Builder = new RangeSetBuilder<Decoration>();
		const DocumentText = State.doc.toString();
		const EmbedRegex = ResetEmbedRegex();

		let Match: RegExpExecArray | null = null;
		while ((Match = EmbedRegex.exec(DocumentText)) !== null) {
			const EmbedStart = Match.index;
			const EmbedEnd = EmbedStart + Match[0].length;
			const LinkPath = Match[1];

			const File = Plugin.ResolveHtmlFile(LinkPath, CurrentFile.path);
			if (!File) {
				continue;
			}

			const CachedContent = Plugin.HtmlCache.get(File.path);
			const IsLoading = CachedContent === undefined;
			if (IsLoading) {
				void Plugin.LoadAndCacheHtml(File);
			}

			const Widget = new HTMLEmbedWidget(
				File,
				Plugin,
				CachedContent ?? '',
				IsLoading,
				EmbedStart,
				EmbedEnd
			);

			Builder.add(
				EmbedStart,
				EmbedEnd,
				Decoration.replace({
					widget: Widget,
					block: true,
					inclusive: false,
					side: -1,
				})
			);
		}

		return Builder.finish();
	} catch (ErrorValue) {
		console.error('Error building HTML embed decorations:', ErrorValue);
		return Decoration.none;
	}
}
