import {
	EditorSelection,
	EditorState,
	Extension,
	Prec,
	RangeSetBuilder,
	StateEffect,
	StateField,
	Transaction,
} from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import {
	editorInfoField as EditorInfoField,
	editorLivePreviewField as EditorLivePreviewField,
} from 'obsidian';
import { HTMLEmbedWidget } from './HTMLEmbedWidget';
import type HtmlViewerPlugin from './Main';
import { CreateHtmlEmbedRegex } from './Utils';

export const HtmlCacheUpdateEffect = StateEffect.define<string>();
export const RevealHtmlEmbedEffect = StateEffect.define<{ from: number; to: number }>();
export const ClearHtmlEmbedRevealEffect = StateEffect.define<void>();

interface HtmlEmbedRange {
	from: number;
	to: number;
}

interface HtmlEmbedFieldValue {
	Decorations: DecorationSet;
	RevealedRange: HtmlEmbedRange | null;
}

const CachedEmbedRegex = CreateHtmlEmbedRegex();

function ResetEmbedRegex(): RegExp {
	CachedEmbedRegex.lastIndex = 0;
	return CachedEmbedRegex;
}

export function CreateHtmlEmbedStateField(Plugin: HtmlViewerPlugin): Extension {
	const HtmlEmbedField = StateField.define<HtmlEmbedFieldValue>({
		create(State): HtmlEmbedFieldValue {
			let IsLivePreview = false;
			try {
				IsLivePreview = State.field(EditorLivePreviewField);
			} catch {
				return {
					Decorations: Decoration.none,
					RevealedRange: null,
				};
			}

			if (!IsLivePreview) {
				return {
					Decorations: Decoration.none,
					RevealedRange: null,
				};
			}

			return BuildHtmlEmbedFieldValue(State, Plugin, null);
		},

		update(FieldValue, TransactionValue): HtmlEmbedFieldValue {
			let IsLivePreview = false;
			try {
				IsLivePreview = TransactionValue.state.field(EditorLivePreviewField);
			} catch {
				return {
					Decorations: Decoration.none,
					RevealedRange: null,
				};
			}

			if (!IsLivePreview) {
				return {
					Decorations: Decoration.none,
					RevealedRange: null,
				};
			}

			// Detect transition from Source Mode to Live Preview and rebuild.
			let WasLivePreview = false;
			try {
				WasLivePreview = TransactionValue.startState.field(EditorLivePreviewField);
			} catch {
				// Field unavailable in start state.
			}

			if (IsLivePreview && !WasLivePreview) {
				return BuildHtmlEmbedFieldValue(TransactionValue.state, Plugin, null);
			}

			let RevealedRange = MapEmbedRange(FieldValue.RevealedRange, TransactionValue);

			const HasCacheUpdate = TransactionValue.effects.some((EffectValue) =>
				EffectValue.is(HtmlCacheUpdateEffect)
			);
			const RevealEffect = TransactionValue.effects.find((EffectValue) =>
				EffectValue.is(RevealHtmlEmbedEffect)
			);
			const HasRevealEffect = RevealEffect !== undefined;
			const HasClearEffect = TransactionValue.effects.some((EffectValue) =>
				EffectValue.is(ClearHtmlEmbedRevealEffect)
			);

			if (HasRevealEffect) {
				RevealedRange = RevealEffect.value;
			}

			if (HasClearEffect) {
				RevealedRange = null;
			}

			if (RevealedRange && ShouldHideRevealedRange(TransactionValue.state.selection, RevealedRange)) {
				RevealedRange = null;
			}

			if (TransactionValue.docChanged) {
				const Decorations = BuildIncrementalDecorations(
					FieldValue.Decorations,
					TransactionValue,
					Plugin,
					RevealedRange
				);
				return {
					Decorations,
					RevealedRange,
				};
			}

			// Only rebuild when the reveal state changed (cursor moved away from a revealed embed).
			const RevealRangeCleared = FieldValue.RevealedRange !== null && RevealedRange === null;
			if (HasCacheUpdate || HasRevealEffect || HasClearEffect || RevealRangeCleared) {
				return BuildHtmlEmbedFieldValue(TransactionValue.state, Plugin, RevealedRange);
			}

			return {
				Decorations: FieldValue.Decorations.map(TransactionValue.changes),
				RevealedRange,
			};
		},

		provide(Field): Extension {
			return [
				EditorView.decorations.from(Field, (Value) => Value.Decorations),
				EditorView.atomicRanges.from(Field, (Value) => (_View) => Value.Decorations),
			];
		},
	});

	return Prec.highest(HtmlEmbedField);
}

function BuildIncrementalDecorations(
	OldDecorations: DecorationSet,
	TransactionValue: Transaction,
	Plugin: HtmlViewerPlugin,
	RevealedRange: HtmlEmbedRange | null
): DecorationSet {
	try {
		let ActualChangeSize = 0;
		TransactionValue.changes.iterChanges((FromA, ToA, FromB, ToB) => {
			ActualChangeSize += ToA - FromA;
			ActualChangeSize += ToB - FromB;
		});

		if (ActualChangeSize > 1000) {
			return BuildHtmlEmbedDecorations(TransactionValue.state, Plugin, RevealedRange);
		}

		let NeedsRebuild = false;
		TransactionValue.changes.iterChangedRanges((FromA, ToA) => {
			OldDecorations.between(FromA, ToA, (DecorationFrom, DecorationTo) => {
				// For `side: -1` block widgets, insertions at the end boundary can move the
				// widget onto the wrong visual line when the embed is isolated by blank lines.
				const IsStartBoundaryInsertion = FromA === ToA && FromA === DecorationFrom;
				if (IsStartBoundaryInsertion) {
					return;
				}

				NeedsRebuild = true;
				return false;
			});
		});

		// Check if the changed lines now contain a new embed pattern.
		if (!NeedsRebuild) {
			const Doc = TransactionValue.state.doc;
			TransactionValue.changes.iterChangedRanges((_FromA, _ToA, FromB, ToB) => {
				if (NeedsRebuild) return;
				const LineFrom = Doc.lineAt(FromB).from;
				const LineTo = Doc.lineAt(ToB).to;
				const LineText = Doc.sliceString(LineFrom, LineTo);
				const TestRegex = CreateHtmlEmbedRegex();
				if (TestRegex.test(LineText)) {
					NeedsRebuild = true;
				}
			});
		}

		if (!NeedsRebuild) {
			return OldDecorations.map(TransactionValue.changes);
		}

		return BuildHtmlEmbedDecorations(TransactionValue.state, Plugin, RevealedRange);
	} catch (ErrorValue) {
		console.error('Error building incremental decorations:', ErrorValue);
		return BuildHtmlEmbedDecorations(TransactionValue.state, Plugin, RevealedRange);
	}
}

function BuildHtmlEmbedFieldValue(
	State: EditorState,
	Plugin: HtmlViewerPlugin,
	RevealedRange: HtmlEmbedRange | null
): HtmlEmbedFieldValue {
	return {
		Decorations: BuildHtmlEmbedDecorations(State, Plugin, RevealedRange),
		RevealedRange,
	};
}

function BuildHtmlEmbedDecorations(
	State: EditorState,
	Plugin: HtmlViewerPlugin,
	RevealedRange: HtmlEmbedRange | null
): DecorationSet {
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
			if (Match[0].startsWith('![[')) {
				continue;
			}

			const EmbedStart = Match.index;
			const EmbedEnd = EmbedStart + Match[0].length;

			if (RangesEqual(RevealedRange, { from: EmbedStart, to: EmbedEnd })) {
				continue;
			}

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

function MapEmbedRange(
	Range: HtmlEmbedRange | null,
	TransactionValue: Transaction
): HtmlEmbedRange | null {
	if (!Range || !TransactionValue.docChanged) {
		return Range;
	}

	const MappedRange = {
		from: TransactionValue.changes.mapPos(Range.from, 1),
		to: TransactionValue.changes.mapPos(Range.to, -1),
	};

	if (MappedRange.from >= MappedRange.to) {
		return null;
	}

	return MappedRange;
}

function ShouldHideRevealedRange(
	Selection: EditorSelection,
	RevealedRange: HtmlEmbedRange
): boolean {
	return !Selection.ranges.some((Range) =>
		RangesIntersect(Range.from, Range.to, RevealedRange.from, RevealedRange.to)
	);
}

function RangesIntersect(
	SelectionFrom: number,
	SelectionTo: number,
	RangeFrom: number,
	RangeTo: number
): boolean {
	if (SelectionFrom === SelectionTo) {
		return SelectionFrom >= RangeFrom && SelectionFrom <= RangeTo;
	}

	return SelectionFrom < RangeTo && SelectionTo > RangeFrom;
}

function RangesEqual(First: HtmlEmbedRange | null, Second: HtmlEmbedRange): boolean {
	return First !== null && First.from === Second.from && First.to === Second.to;
}
