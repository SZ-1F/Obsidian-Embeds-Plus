import { HTMLElement } from 'node-html-parser';
import { MediaPlaceholderEl } from 'Source/Constants';
import { BuildMediaAttributes } from '../LibENEXHelpers';
import { RootLog } from 'Source/Logger';

let ModuleLog = RootLog.getSubLogger({
  name: "ENEX-MEDIA",
});
/**
* Converts <en-media> elements to standard HTML <img> tags.
* Generates a lookup table containing media hashes and their Base64 content.
*
* @param {HTMLElement} MediaEl HTML element corresponding to the en-media tag.
* @returns {string} - Converted HTML string with an image, or placeholder element.
*/
export function MediaHandler(MediaEl: HTMLElement, ResourceLookupTable: Record<string, string>): string {
  // Check if the element is an image.
  let HTMLOutput: string = MediaPlaceholderEl;
  let MediaType: string | undefined;
  if ((MediaType = MediaEl.getAttribute("type"))?.includes("image")) {
    ModuleLog.trace(`Processing en-media element with type: ${MediaType}`);
    const ElementHash: string = MediaEl.getAttribute("hash") || '';
    const AttributeString = BuildMediaAttributes(MediaEl);
    if (ResourceLookupTable[ElementHash]) {
      ModuleLog.trace(`Media element resolved via hash lookup, generating img element`);
      HTMLOutput = `<img src="data:${MediaType};base64, ${ResourceLookupTable[ElementHash]}"${AttributeString || ' alt="Embedded Image"'} />`;
    } else {
      HTMLOutput = MediaPlaceholderEl;
    }
  } else {
    ModuleLog.debug(`Media element type "${MediaType || 'unknown'}" is not a supported image type, falling back to placeholder`);
  }
  return HTMLOutput;
}