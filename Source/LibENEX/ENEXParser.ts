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
  PlaceholderEl,
  ParserErrorEl,
} from 'Source/Constants';
import { RootLog } from 'Source/Logger';

let ModuleLog = RootLog.getSubLogger({
  name: "ENEX-PARSER",
});

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
  let ENEXDOM: HTMLElement;
  let Note: HTMLElement;
  let NoteBody: HTMLElement;
  try {
    ENEXDOM = parse(RawENEXString);
    Note = ENEXDOM?.getElementsByTagName("note")?.[0] || null;
    NoteBody = Note?.getElementsByTagName("en-note")?.[0] || null;
    if (!(NoteBody && Note)) throw new Error("Unable to extract note content")
    ModuleLog.debug("Successfully parsed ENEX string, and extracted note content")
  }
  catch(e) {
    const Message: string = e instanceof Error ? e.message : String(e);
    ModuleLog.fatal(`Failed to parse ENEX content: ${Message}`);
    return `Failed to parse ENEX content: ${Message}`;
  }

  // Initialise final HTML string that will be passed to renderer.
  let HTMLOutputArray: Array<string> = [];

  // Extract resources, generate a lookup table.
  ModuleLog.trace("Extract resources elements and generating resource table...");
  const Resources: HTMLElement[] | null = Note.getElementsByTagName("resource") || null;
  const ResourceLookupTable: Record<string, string> = GetResourceTable(Resources);
  ModuleLog.debug(`Successfully extracted ${Number(Resources.length || null)} resources`);

  // Get all elements. Use query selector to get all descendants.
  ElementLoop: for (const El of NoteBody.children) {
    const Tag: string = El.tagName.toLowerCase();
    ModuleLog.trace(`Parsing element with the tag: ${Tag}...`);

    // Check for custom Evernote tags.
    if (Tag.startsWith("en-")) {
      if (KnownENElements.has(Tag)) {
        // Pass to custom handlers.
        switch (Tag) {
          case "en-media":
            ModuleLog.trace(`${Tag} being passed to MediaHandler, with a lookup table...`);
            HTMLOutputArray.push((BlockHandlers.MediaHandler(El, ResourceLookupTable)) || ParserErrorEl);
            continue ElementLoop;
        }
      }
      else {
        HTMLOutputArray.push(PlaceholderEl);
        ModuleLog.debug(`Custom EN tag: "${Tag}" is not supported; falling back to placeholder`);
        continue ElementLoop;
      }
    }

    // Check if the element is a <div> with EN custom properties.
    const Style: string | undefined = El.getAttribute('style');
    if (Tag === "div" && Style) {
      const Properties = ExtractENProperties(Style);
      ModuleLog.trace(`Custom <div> element with style properties found; extracted the following propeties: ${JSON.stringify(Properties)}`);
      // Find the first known EN property on this element and dispatch to its handler.
      for (const [PropertyName] of Properties) {
        ModuleLog.trace(`Processing property: ${PropertyName}`);
        if (KnownENElements.has(PropertyName)) {
          switch (PropertyName) {
            case "--en-task-group":
              El.childNodes.forEach((Child) => { El.removeChild(Child) });
              HTMLOutputArray.push(BlockHandlers.TasksHandler(Note) || '');
              ModuleLog.trace(`Property: ${PropertyName} is being handed to TasksHandler()`);
              continue ElementLoop;
            case "--en-callout":
              HTMLOutputArray.push(BlockHandlers.CalloutHandler(El));
              ModuleLog.trace(`Property ${PropertyName} is being handed to CalloutHandler()`);
              continue ElementLoop;
            case "--en-clipped-content":
              HTMLOutputArray.push(BlockHandlers.WebClipHandler(El, ResourceLookupTable));
              ModuleLog.trace(`Property ${PropertyName} is being handed to WebClipHandler()`);
              continue ElementLoop;
            case "--en-mermaidblock":
              try {
                HTMLOutputArray.push(await BlockHandlers.MermaidHandler(El))
              }
              catch (e) {
                const Message: string = e instanceof Error ? e.message : String(e);
                HTMLOutputArray.push(ParserErrorEl);
                ModuleLog.warn(`Error when calling MermaidHandler(), falling back to placeholder: ${Message}`);
              }
              continue ElementLoop;
            case "--en-formulablock":
              try {
                HTMLOutputArray.push(await BlockHandlers.FormulaHandler(El));
              }
              catch (e) {
                const Message: string = e instanceof Error ? e.message : String(e);
                HTMLOutputArray.push(ParserErrorEl);
                ModuleLog.warn(`Error when calling MermaidHandler(), falling back to placeholder: ${Message}`);
              }
              continue ElementLoop;
          }
        } else if (!IgnoredENProps.has(PropertyName)) {
          HTMLOutputArray.push(PlaceholderEl);
          ModuleLog.debug(`Element "${Tag}" has an unsupported property: ${PropertyName}; falling back to placeholder`);
          continue ElementLoop;
        }
      }
    }
    // Element is standard HTML, no custom handling required.
    ModuleLog.trace(`Element "${Tag}" is standard HTML, no transformation being applied`);
    HTMLOutputArray.push(El.toString());
  }
  // Add HTML boilerplate to final output.
  ModuleLog.trace(`Parsing note metadata...`);
  try {
    HTMLOutputArray.unshift(BlockHandlers.ParseNoteMetadata(Note));
  }
  catch(e) {
    let Message: string = e instanceof Error ? e.message : String(e);
    ModuleLog.warn(`Failed to parse metadata: ${Message}`);
  }
  HTMLOutputArray.unshift(`<html><head><style>${ENCSS}</style></head><meta charset="utf-8"><body class="${ThemeColor}"><en-note>`);
  HTMLOutputArray.push('</en-note></body></html>');

  ModuleLog.trace(`Generating final HTML output...`);
  return (HTMLOutputArray.join(""));
}
