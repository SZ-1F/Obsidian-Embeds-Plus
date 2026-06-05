import { HTMLElement, parse } from 'node-html-parser';
import { ENCSS } from 'Source/LibENEX/ENEXStyles';
import { ParseNoteMetadata, MediaHandler, TasksHandler, CalloutHandler } from 'Source/LibENEX/ENBlockHandlers';
import { IgnoredENProps, KnownENElements, ENCustomPropertiesRegex, PlaceholderEl } from 'Source/Constants';
import SparkMD5 from 'spark-md5';

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
export function ParseENEX(RawENEXString: string): string {
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
        let ParsedEl: string | null = (MediaHandler(El, ResourceLookupTable)) || null;
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
    if ((Tag === "div") && (Style)) {
      let MatchArray: RegExpExecArray | null;
      ENCustomPropertiesRegex.lastIndex = 0;
      while ((MatchArray = ENCustomPropertiesRegex.exec(Style)) !== null) {
        const [, PropertyName, PropertyValue] = MatchArray;
        if (KnownENElements.has(PropertyName)) {
          switch (PropertyName) {
            case ("--en-task-group"):
              El.childNodes.forEach((Child) => { El.removeChild(Child) });
              HTMLOutputArray.push(TasksHandler(Note) || '');
              continue ElementLoop;
            case ("--en-callout"):
              HTMLOutputArray.push(CalloutHandler(El));
              continue ElementLoop;
          }
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

/**
* Helper function to generate a lookup table for embedded resources.
*
* Takes each <resource> element, determines the MD5 hash, and returns a lookup table
* containing the raw Base64 encoded data and the hash.
*
* @param {HTMLElement[]} Resources The full contents of an ENEX file (single note) as a string.
* @returns {Record<string, string>} Lookup table for all resources.
*/
export function GetResourceTable(Resources: HTMLElement[]): Record<string, string> {
  // Get all resource elements, generate a resource to hash table.
  let ResourceLookupTable: Record<string, string> = {};
  Resources.forEach((Resource) => {
    // Get the child element containing the B64 data for the resource.
    const RawBase64: string = Resource.querySelector('data')
      ?.textContent
      ?.replace(/\s+/g, '')
      ?? '';

    // Get the MD5 hash corresponding to the resource.
    const Bytes = Uint8Array.from(atob(RawBase64), c => c.charCodeAt(0));
    const Hash: string = SparkMD5.ArrayBuffer.hash(Bytes.buffer);

    // Add the record to the lookup table.
    ResourceLookupTable[Hash] = RawBase64;
  })
  return ResourceLookupTable;
}
