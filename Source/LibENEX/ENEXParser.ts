import {
  HTMLElement,
  parse
} from 'node-html-parser';
import { ENCSS } from 'Source/LibENEX/ENEXStyles';
import * as BlockHandlers from 'Source/LibENEX/Blocks/ENBlockHandlers';
import {
  ExtractENProperties,
  GetResourceTable
} from './LibENEXHelpers';
import {
  IgnoredENProps,
  KnownENElements,
  PlaceholderEl
} from 'Source/Constants';

/**
* Main parsing function for `.enex` files.
*
* Converts raw ENEX string to DOM, then iterates over each element,
* invoking a custom handler where needed.
*
* @param {string} RawENEXString The full contents of an ENEX file (single note) as a string.
* @param {string} ThemeColor Current theme being used (dark/light mode). Either 'darkMode', or ''.
* @throws {Error} - Unable to parse ENEX content (not valid XML, etc.).
* @returns {Promise<string>} - Converted HTML string containing parsed elements from ENEX file.
*/
export async function ParseENEX(RawENEXString: string, ThemeColor: string = ''): Promise<string> {
  // Parse the raw ENEX string, convert it to DOM. Extract only the first note & its main contents.
  const ENEXDOM = parse(RawENEXString) || null;
  const Note: HTMLElement | null = (ENEXDOM.getElementsByTagName("note"))[0] || null;
  const NoteBody: HTMLElement | null = (Note.getElementsByTagName("en-note"))[0] || null;

  if ((!ENEXDOM) || (!Note) || (!NoteBody)) throw new Error("Error: Parsing failure: unable to extract note content.");

  // Initialise final HTML string that will be passed to renderer.
  let HTMLOutputArray: Array<string> = [];

  // Extract resources, generate a lookup table.
  const Resources: HTMLElement[] | null = Note.getElementsByTagName("resource") || null;
  const ResourceLookupTable: Record<string, string> = GetResourceTable(Resources);

  // Get all elements. Use query selector to get all descendants.
  ElementLoop: for (const El of NoteBody.children) {
    const Tag: string = El.tagName.toLowerCase();

    // Check for custom Evernote tags.
    if (Tag.startsWith("en-")) {
      if (KnownENElements.has(Tag)) {
        // Pass to custom handler.
        let ParsedEl: string | null = (BlockHandlers.MediaHandler(El, ResourceLookupTable)) || null;
        if (ParsedEl) HTMLOutputArray.push(ParsedEl);
        continue ElementLoop;
      }
      else {
        console.debug(`Tag name "${Tag}" is not supported!`)
        HTMLOutputArray.push(PlaceholderEl);
        continue ElementLoop;
      }
    }

    // Check if the element is a <div> with EN custom properties.
    const Style: string | undefined = El.getAttribute('style');
    if (Tag === "div" && Style) {
      const Properties = ExtractENProperties(Style);
      // Find the first known EN property on this element and dispatch to its handler.
      for (const [PropertyName] of Properties) {
        if (KnownENElements.has(PropertyName)) {
          switch (PropertyName) {
            case "--en-task-group":
              El.childNodes.forEach((Child) => { El.removeChild(Child) });
              HTMLOutputArray.push(BlockHandlers.TasksHandler(Note) || '');
              continue ElementLoop;
            case "--en-callout":
              HTMLOutputArray.push(BlockHandlers.CalloutHandler(El));
              continue ElementLoop;
            case "--en-clipped-content":
              HTMLOutputArray.push(BlockHandlers.WebClipHandler(El, ResourceLookupTable));
              continue ElementLoop;
            case "--en-mermaidblock":
              HTMLOutputArray.push(await BlockHandlers.MermaidHandler(El));
              continue ElementLoop;
            case "--en-formulablock":
              HTMLOutputArray.push(await BlockHandlers.FormulaHandler(El));
              continue ElementLoop;
          }
        } else if (!IgnoredENProps.has(PropertyName)) {
          console.debug(`Element "${Tag}" has an unsupported property: ${PropertyName}`);
          HTMLOutputArray.push(PlaceholderEl);
          continue ElementLoop;
        }
      }
    }
    // Element is standard HTML, no custom handling required.
    HTMLOutputArray.push(El.toString());
  }
  // Add HTML boilerplate to final output.
  HTMLOutputArray.unshift(BlockHandlers.ParseNoteMetadata(Note));
  HTMLOutputArray.unshift(`<html><head><style>${ENCSS}</style></head><meta charset="utf-8"><body class="${ThemeColor}"><en-note>`);
  HTMLOutputArray.push('</en-note></body></html>');

  return (HTMLOutputArray.join(""));
}
