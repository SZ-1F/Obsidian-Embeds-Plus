import { HTMLElement, parse } from 'node-html-parser';
import { ENCSS } from 'Source/LibENEX/ENEXStyles';
import { ParseNoteMetadata, NoteMetadata, PlaceholderEl, GenerateNoteHeader } from 'Source/LibENEX/ENBlockHandlers';

/**
* Main parsing function for `.enex` files.
*
* Converts raw ENEX string to DOM, then iterates over each element,
* invoking a custom handler where needed.
*
* @param {string} RawENEXString The full contents of an ENEX file (single note) as a string.
* @throws {Error} - Unable to parse ENEX content (not valid XML, etc.).
* @returns {string} - Converted HTML string containing parsed elements from ENEX file.
*/
export function ParseENEX($RawENEXString: string): string {
  // Parse the raw ENEX string, convert it to DOM.
  const ENEXDOM = parse($RawENEXString);
  if (!ENEXDOM) throw new Error("Error: Failed to parse ENEX content.");

  // Extract only the first note & its main contents.
  const Note: HTMLElement | null = (ENEXDOM.getElementsByTagName("note"))[0] || null;
  const NoteBody: HTMLElement | null = (Note.getElementsByTagName("en-note"))[0] || null;

  // Define regular expression for matching Evernote's custom properties.
  const ENCustomPropertiesRegex: RegExp = /(--en-[\w-]+)\s*:\s*([^;]+)/g;

  // List of ignored Evernote metadata properties.
  const IgnoredENProps: Set<string> = new Set([
    // Custom metadata properties.
    "--en-chs",
    "--en-content-hash",
    "--en-nodeId",
    "--en-id",
    "--en-lineWrapping",
    "--en-isCollapsed",
    "--en-toggle",
    "--en-expanded",
    "--en-requiredFeatures",
  ]);

  // List of known Evernote custom properties. Elements covered by this list need custom handling.
  const KnownENElements: Set<string> = new Set([
    // Custom properties.
    "--en-calendarEvent",
    "--en-calendarBlock",
    "--en-codeblock",
    "--en-task-group",
    "--en-tableofcontents",
    "--en-todo",
    // Custom Evernote tags.
    "en-media"
  ]);

  const KnownHTMLElements:Set<string> = new Set([
    // Block.
    "div", "p", "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "blockquote", "pre", "address",
    "center", "hr", "br", "table", "thead", "tbody",
    "tfoot", "tr", "th", "td", "col", "colgroup",
    // Inline.
    "span", "a", "img", "b", "strong", "i", "em",
    "u", "s", "strike", "del", "sup", "sub", "code",
    "tt", "abbr", "acronym", "cite", "dfn", "kbd",
    "samp", "var", "q", "big", "small", "font",
  ]);

  // Initialise final HTML string that will be passed to renderer.
  let HTMLOutputArray: Array<string> = [];

  // Get all elements. Use query selector to get all descendants.
  ElementLoop: for (const El of NoteBody.children) {
    const Tag: string = El.tagName.toLowerCase();

    // Check for custom Evernote tags.
    if (Tag.startsWith("en-")) {
      if (KnownENElements.has(Tag)) {
        // Pass to custom handler.
        // Continue Element Loop.
      }
      else {
        console.debug(`Tag name "${Tag}" is not supported!`)
        HTMLOutputArray.push(PlaceholderEl);
        continue ElementLoop;
      }
    }

    // Check if the element is a <div> with EN custom properties.
    const Style: string | undefined = El.getAttribute('style');
    if ((Tag === "div") && (Style)) {
      let MatchArray: RegExpExecArray | null;
      while ((MatchArray = ENCustomPropertiesRegex.exec(Style)) !== null) {
        const [, PropertyName, PropertyValue] = MatchArray;
        if (KnownENElements.has(PropertyName)) {
          // Hand over to custom handler, then push result to array.
          // Continue the loop.
        }
        else if (!IgnoredENProps.has(PropertyName)) {
          // <div> with an unknown custom property.
          console.debug(`Element "${Tag}" has an unsupported property: ${PropertyName}`)
          HTMLOutputArray.push(PlaceholderEl);
          continue ElementLoop;
        }
      }
    }
    // Element is standard HTML, no custom handling required.
    HTMLOutputArray.push(El.toString());
  }
  // Add HTML boilerplate to final output.
  HTMLOutputArray.unshift(ParseNoteMetadata(Note));
  HTMLOutputArray.unshift(`<html><head><style>${ENCSS}</style></head><body class=""><en-note>`);
  HTMLOutputArray.push('</en-note></body></html>');

  return (HTMLOutputArray.join(""));
}
