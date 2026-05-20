import { HTMLElement, parse } from 'node-html-parser';
import { ENCSS } from 'Source/LibENEX/ENEXStyles';

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

  // Extract main note body.
  let NoteBody: HTMLElement | null = (ENEXDOM.getElementsByTagName("en-note"))[0] || null;

  // List of known Evernote custom properties. Elements covered by this list need custom handling.
  const KnownENElements: Array<string> = [
    "--en-calendarEvent",
    "--en-calendarBlock",
    "--en-codeblock:true",
    "--en-task-group",
    "--en-tableofcontents",
  ];

  // Define regular expression for matching Evernote's custom properties.
  const ENCustomPropertiesRegex: RegExp = /(--en-[\w-]+)\s*:\s*([^;]+)/g;

  // Initialise final HTML string that will be passed to renderer.
  let HTMLOutputArray: Array<string> = [];

  // Get all elements. Use query selector to get all descendants.
  (NoteBody.children)
    .forEach((El) => {
      HTMLOutputArray.push(El.toString()); // Temporarily pass all elements directly into the output array.
    }
  )
  // Add HTML boilerplate to final output.
  HTMLOutputArray.unshift(`<html><head><style>${ENCSS}</style></head><body class=""><en-note>`);
  HTMLOutputArray.push('</en-note></body></html>');

  return (HTMLOutputArray.join(""));
}

