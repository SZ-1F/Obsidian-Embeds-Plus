// Shared helper functions for ENEX parsing.

import { HTMLElement } from "node-html-parser";
import { ENCustomPropertiesRegex } from "Source/Constants";
import SparkMD5 from 'spark-md5';
import { RootLog } from 'Source/Logger';

let ModuleLog = RootLog.getSubLogger({
  name: "ENEX-HELPERS",
});

// Interface for validating note metadata.
export interface NoteMetadata {
  NoteTitle: string;
  Author: string;
  CreatedDate: string;
  UpdatedDate: string;
  ReminderTime: string;
  ReminderOrder: string;
  Tags: Array<string> | undefined;
}

// Interface for validating note metadata.
export interface TaskMetadata {
  TaskTitle: string;
  Status: "completed" | "open";
  Flagged: boolean;
  Recurrence?: string;
  DueDate?: string;
  Description?: string;
  Reminders?: Array<string>;
  ReminderTimezone?: string;
}

/**
* Converts date formats used in ENEX files to a human-readable format.
*
* @param {string} RawTimeString Raw date/time string.
* @param {string} Timezone Desired timezone.
* @returns {string} - Date & time as a readable string.
*/
export const FormatENEXDate = (RawTimeString: string, Timezone: string = "UTC") => {
  if (RawTimeString === 'Undated') return;
  const ISODate: string = RawTimeString.replace(
    /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/,
    "$1-$2-$3T$4:$5:$6Z"
  );
  // Return early if the date string didn't match the expected ENEX format.
  if (isNaN(new Date(ISODate).getTime())) return;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: Timezone });
  }
  catch (e) {
    const Message: string = e instanceof Error ? e.message : String(e);
    Timezone = "UTC";
    ModuleLog.warn(`Failed to parse timezone string, defaulting to UTC: ${Message}`);
  }
  const Parts: { [k: string]: string } = Object.fromEntries(
    new Intl.DateTimeFormat("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: Timezone,
    })
      .formatToParts(new Date(ISODate))
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value])
  );
  return `${Parts.weekday}, ${Parts.day} ${Parts.month} ${Parts.year} @ ${Parts.hour}:${Parts.minute}${(Parts.dayPeriod || '').toLowerCase()}`;
};

/**
* Extracts EN custom CSS properties from an inline style string.
*
* @param {string | undefined} Style Inline style string from an EN block.
* @returns {Map<string, string>} - Map of EN custom property names and values.
*/
export const ExtractENProperties = (Style: string | undefined): Map<string, string> => {
  const Properties = new Map<string, string>();
  if (!Style) {
    return Properties;
  }
  for (const [, Name, Value = ""] of Style.matchAll(ENCustomPropertiesRegex)) {
    Properties.set(Name, Value);
  }
  ModuleLog.trace(`Extracted ${Properties.size} custom EN propert${Properties.size === 1 ? 'y' : 'ies'} from style string`);
  return Properties;
};

/**
* Escapes HTML-special characters from HTML strings.
*
* @param {string} RawValue Raw attribute value before escaping.
* @returns {string} - Escaped attribute-safe string.
*/
export const EscapeHTMLAttribute = (RawValue: string): string => {
  return RawValue
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

/**
* Builds a string of safe image attributes preserved from an `en-media` node.
*
* @param {HTMLElement} MediaEl Original `en-media` element.
* @returns {string} - Escaped attribute string for HTML image output.
*/
export const BuildMediaAttributes = (MediaEl: HTMLElement): string => {
  const AttributesToPreserve = ['style', 'width', 'height', 'class', 'alt', 'title'];
  let AttributeString = '';
  for (const AttributeName of AttributesToPreserve) {
    const AttributeValue = MediaEl.getAttribute(AttributeName);
    if (!AttributeValue) {
      continue;
    }
    AttributeString += ` ${AttributeName}="${EscapeHTMLAttribute(AttributeValue)}"`;
  }
  ModuleLog.trace(`Built attribute string for en-media element`);
  return AttributeString;
};

/**
* Normalises inline height declarations that force clipped pages to overflow.
*
* @param {HTMLElement} Element Element whose inline styles are being normalised.
* @returns {void}
*/
export const NormaliseHeightStyle = (Element: HTMLElement): void => {
  const StyleValue = Element.getAttribute('style');
  if (!StyleValue) {
    return;
  }
  const Declarations = StyleValue
    .split(';')
    .map((Declaration) => Declaration.trim())
    .filter((Declaration) => Declaration.length > 0);
  const FilteredDeclarations = Declarations.filter((Declaration) => {
    const [PropertyRaw, ValueRaw = ''] = Declaration.split(':', 2);
    const PropertyName = PropertyRaw.trim().toLowerCase();
    const PropertyValue = ValueRaw.trim().toLowerCase();
    if (PropertyName === 'min-height') {
      return false;
    }
    if (
      PropertyName === 'height' &&
      (PropertyValue === '100%' || PropertyValue.endsWith('vh'))
    ) {
      return false;
    }
    return true;
  });

  if (FilteredDeclarations.length === Declarations.length) {
    return;
  }
  const RemovedCount = Declarations.length - FilteredDeclarations.length;
  ModuleLog.trace(`Normalised height styles on element, removed ${RemovedCount} declaration(s)`);
  if (FilteredDeclarations.length === 0) {
    Element.removeAttribute('style');
    return;
  }
  Element.setAttribute('style', `${FilteredDeclarations.join('; ')};`);
};

/**
* Generates the HTML block that is injected above the note body, containing
* metadata such as author, creation time, tags, etc.
*
* @param {NoteMetadata} NoteMetadata Extracted note metadata.
* @returns {string} - HTML string displaying note properties.
*/
export const GenerateNoteHeader = (NoteMetadata?: NoteMetadata): string => {
  let HTMLTags: string = "";

  if (!NoteMetadata) {
    let Header: string = `
      <div><span class="badge">READ ONLY</span></div>
      <h1 class="en-note-title">Untitled Note</h1>
      <div class="en-properties-header">
        <div class="en-properties-metadata">
          <span class="en-meta-row en-meta-error">Unable to retrieve note metadata</span>
        </div>
      </div>`.replace(/\n\s*/g, "");
    ModuleLog.warn(`Note metadata could not be retrieved, fallback used`);
    return Header;
  }
  else {
    NoteMetadata.Tags?.forEach((Tag) => {
      HTMLTags += `<span class="tag">${EscapeHTMLAttribute(Tag)}</span>`;
    });
    let Header: string = `
      <div><span class="badge">READ ONLY</span></div>
      <h1 class="en-note-title">${EscapeHTMLAttribute(NoteMetadata.NoteTitle)}</h1>
      <div class="en-properties-header">
        <div class="en-properties-metadata">
          <span class="en-meta-row en-meta-author">${EscapeHTMLAttribute(NoteMetadata.Author)}</span>
          <span class="en-meta-row en-meta-created"><b>Created:</b> ${FormatENEXDate(NoteMetadata.CreatedDate)}</span>
          <span class="en-meta-row en-meta-updated"><b>Updated:</b> ${FormatENEXDate(NoteMetadata.UpdatedDate)}</span>
        </div>
        <div class="en-properties-tags">${HTMLTags || '<span class="mutedText"><i>No Tags</i></span>'}</div>
      </div>`.replace(/\n\s*/g, "");
    ModuleLog.trace(`Generated note header`);
    return Header;
  }
}

/**
* Helper function to generate a lookup table for embedded resources.
*
* Takes each <resource> element, determines the MD5 hash, and returns a lookup table
* containing the raw Base64 encoded data and the hash.
*
* @param {HTMLElement[]} Resources The full contents of an ENEX file (single note) as a string.
* @returns {Record<Hash: string, B64: string>} Lookup table for all resources.
*/
export function GetResourceTable(Resources: HTMLElement[]): Record<string, string> {
  // Get all resource elements, generate a resource to hash table.
  ModuleLog.trace(`Processing ${Resources.length} resource element(s)...`);
  let ResourceLookupTable: Record<string, string> = {};
  Resources.forEach((Resource) => {
    // Get the child element containing the B64 data for the resource.
    const RawBase64: string = Resource.querySelector('data')
      ?.textContent
      ?.replace(/\s+/g, '')
      ?? '';

    // Get the MD5 hash corresponding to the resource.
    try {
      const Bytes = Uint8Array.from(atob(RawBase64), c => c.charCodeAt(0));
      const Hash: string = SparkMD5.ArrayBuffer.hash(Bytes.buffer);
      // Add the record to the lookup table.
      ResourceLookupTable[Hash] = RawBase64;
      ModuleLog.trace(`Successfully hashed resource, adding to lookup table`);
    }
    catch (e) {
      const Message: string = e instanceof Error ? e.message : String(e);
      // Log failures, but continue with the remaining attachments.
      ModuleLog.warn(`Failed to parse resource attachment, skipping: ${Message}`);
    }
  })
  return ResourceLookupTable;
}