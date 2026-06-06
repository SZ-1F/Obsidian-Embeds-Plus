/**
 * Logic for EN-specific elements that need custom handling.
 */

import { HTMLElement } from "node-html-parser";
import { MediaPlaceholderEl, ENCustomPropertiesRegex } from 'Source/Constants';
import { EmbedIconSVGMarkup, OpenIconSVGMarkup } from 'Source/EmbedIcons';

// Interface for validating note metadata.
export interface NoteMetadata {
  NoteTitle: string;
  Author: string;
  CreatedDate: string;
  UpdatedDate: string;
  ReminderTime: string;
  ReminderOrder: string;
  Tags: Array<string>;
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
* Escapes HTML-special characters from HTML strings.
*
* @param {string} RawValue Raw attribute value before escaping.
* @returns {string} - Escaped attribute-safe string.
*/
const EscapeHTMLAttribute = (RawValue: string): string => {
  return RawValue
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

/**
* Extracts EN custom CSS properties from an inline style string.
*
* @param {string | undefined} Style Inline style string from an EN block.
* @returns {Map<string, string>} - Map of EN custom property names and values.
*/
const ExtractENProperties = (Style: string | undefined): Map<string, string> => {
  const Properties = new Map<string, string>();
  if (!Style) {
    return Properties;
  }

  for (const [, Name, Value = ""] of Style.matchAll(ENCustomPropertiesRegex)) {
    Properties.set(Name, Value);
  }

  return Properties;
};

/**
* Builds a string of safe image attributes preserved from an `en-media` node.
*
* @param {HTMLElement} MediaEl Original `en-media` element.
* @returns {string} - Escaped attribute string for HTML image output.
*/
const BuildMediaAttributes = (MediaEl: HTMLElement): string => {
  const AttributesToPreserve = ['style', 'width', 'height', 'class', 'alt', 'title'];
  let AttributeString = '';
  for (const AttributeName of AttributesToPreserve) {
    const AttributeValue = MediaEl.getAttribute(AttributeName);
    if (!AttributeValue) {
      continue;
    }

    AttributeString += ` ${AttributeName}="${EscapeHTMLAttribute(AttributeValue)}"`;
  }

  return AttributeString;
};

/**
* Normalises inline height declarations that force clipped pages to overflow.
*
* @param {HTMLElement} Element Element whose inline styles are being normalised.
* @returns {void}
*/
const NormaliseHeightStyle = (Element: HTMLElement): void => {
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

  if (FilteredDeclarations.length === 0) {
    Element.removeAttribute('style');
    return;
  }

  Element.setAttribute('style', `${FilteredDeclarations.join('; ')};`);
};

/**
* Prepares clipped HTML so it renders consistently inside the web clip frame.
*
* @param {HTMLElement} ClipBlock Root clipped content block.
* @param {Record<string, string>} ResourceLookupTable Resource lookup table keyed by media hash.
* @returns {void}
*/
const PrepareWebClipContent = (
  ClipBlock: HTMLElement,
  ResourceLookupTable: Record<string, string>
): void => {
  ClipBlock.querySelectorAll('en-media').forEach((MediaEl) => {
    const ParsedMedia = MediaHandler(MediaEl, ResourceLookupTable);
    MediaEl.replaceWith(ParsedMedia);
  });

  ClipBlock.querySelectorAll('[style]').forEach((StyledEl) => {
    NormaliseHeightStyle(StyledEl);
  });
};

/**
* Converts date formats used in ENEX files to a human-readable format.
*
* @param {string} RawTimeString Raw date/time string.
* @param {string} Timezone Desired timezone.
* @returns {string} - Date & time as a readable string.
*/
const FormatENEXDate = (RawTimeString: string, Timezone: string = "UTC") => {
  if (RawTimeString === 'Undated') return;
  const ISODate: string = RawTimeString.replace(
    /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/,
    "$1-$2-$3T$4:$5:$6Z"
  );
  const Parts: {[k:string]: string} = Object.fromEntries(
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
  return `${Parts.weekday}, ${Parts.day} ${Parts.month} ${Parts.year} @ ${Parts.hour}:${Parts.minute}${Parts.dayPeriod.toLowerCase()}`;
};

/**
* Generates the HTML block that is injected above the note body, containing
* metadata such as author, creation time, tags, etc.
*
* @param {NoteMetadata} NoteMetadata Extracted note metadata.
* @returns {string} - HTML string displaying note properties.
*/
export const GenerateNoteHeader = (NoteMetadata: NoteMetadata): string => {
  let HTMLTags: string = "";
  NoteMetadata.Tags.forEach((Tag) => {
    HTMLTags += `<span class="tag">${Tag}</span>`;
  })
  let Header: string = `
    <div><span class="badge">READ ONLY</span></div>
    <h1 class="en-note-title">${NoteMetadata.NoteTitle}</h1>
    <div class="en-properties-header">
      <div class="en-properties-metadata">
        <span class="en-meta-row en-meta-author">${NoteMetadata.Author || "-"}</span>
        <span class="en-meta-row en-meta-created"><b>Created:</b> ${FormatENEXDate(NoteMetadata.CreatedDate) || "-"}</span>
        <span class="en-meta-row en-meta-updated"><b>Updated:</b> ${FormatENEXDate(NoteMetadata.UpdatedDate) || "-"}</span>
      </div>
      <div class="en-properties-tags">${HTMLTags || ""}</div>
    </div>`.replace(/\n\s*/g, "");
  return Header;
}

/**
* Generates a HTML block for tasks that is injected into DOM for rendering.
* Inlcudes metadata such as title, reminders, flags, etc.
*
* @param {TaskMetadata} TaskMetadata All metadata (i.e. child elements between <task> nodes).
* @returns {string} - HTML string, complete, styles task block.
*/
export const GenerateTaskEl = (TaskMetadata: TaskMetadata): string => {
  let TaskEl: string = `
    <div class="en-task" data-status="${TaskMetadata.Status}">
      <div class="en-task-checkbox"></div>
      <div class="en-task-title">${TaskMetadata.TaskTitle}</div>
      <div class="en-task-date">${TaskMetadata.DueDate || ""}</div>
      <div class="en-task-metadata">
        <span class="en-task-recurrence">${TaskMetadata.Recurrence || ""}</span>
        <span class="en-task-flag">${(TaskMetadata.Flagged) === true ? "true" : ""}</span>
        <span class="en-task-reminder">${(TaskMetadata.Reminders) ? "true" : ""}</span>
      </div>
    </div>
  `.replace(/\n\s*/g, "");
  return TaskEl;
}

/**
* Generates a HTML block for callout elements that is injected into DOM for rendering.
*
* @param {Map<string, string>} Properties Callout properties, i.e, color, emoji, and content.
* @param {string} Contents Inner HTML content from the callout block.
* @returns {string} - HTML string, complete, styles task block.
*/
export const GenerateCalloutEl = (Properties: Map<string, string>, Contents: string): string => {
  let CalloutEl: string = `
    <div class="en-callout en-callout-${ Properties.get('--en-color') || 'plain' }">
      <div class="en-callout-emoji">${ Properties.get('--en-emoji') || '?' }</div>
      <div class="en-callout-content">
        ${Contents}
      </div>
    </div>
  `.replace(/\n\s*/g, "");
  return CalloutEl;
}

/**
* Converts EN web clip blocks into a framed HTML container for rendering.
*
* @param {HTMLElement} ClipBlock Web clip block from parsed ENEX markup.
* @param {Record<string, string>} ResourceLookupTable Resource lookup table keyed by media hash.
* @returns {string} - Converted HTML string for the web clip block.
*/
export function WebClipHandler(ClipBlock: HTMLElement, ResourceLookupTable: Record<string, string>): string {
  const Properties = ExtractENProperties(ClipBlock.getAttribute('style'));
  const SourceURL = (Properties.get('--en-clipped-source-url') || '').trim();
  const ClipType = ((Properties.get('--en-clipped-content') || '').trim()) || 'unknown';

  PrepareWebClipContent(ClipBlock, ResourceLookupTable);

  let ClipContents = '';
  ClipBlock.childNodes.forEach((Node) => {
    ClipContents += Node.toString();
  });

  const OpenSourceButton = SourceURL
    ? `<a class="en-web-clip-button html-embed-button html-embed-button-text" href="${EscapeHTMLAttribute(SourceURL)}" target="_blank" rel="noopener noreferrer"><span class="html-embed-button-icon">${OpenIconSVGMarkup}</span><span class="html-embed-button-label">Open Source URL</span></a>`
    : '';
  const Header = `<div class="en-web-clip-header html-embed-header"><div class="en-web-clip-header-left html-embed-header-left"><div class="html-embed-icon">${EmbedIconSVGMarkup}</div><div class="html-embed-filename">Web Clip</div></div><div class="en-web-clip-header-right html-embed-header-right">${OpenSourceButton}</div></div>`;

  return `
    <div class="en-web-clip" data-clip-type="${EscapeHTMLAttribute(ClipType)}">
      <div class="en-web-clip-shell markdown-embed">
        ${Header}
        <div class="en-web-clip-body markdown-embed-content">
          <div class="en-web-clip-frame html-embed-iframe-container">
            <div class="en-web-clip-content">${ClipContents}</div>
          </div>
        </div>
      </div>
    </div>
  `.replace(/\n\s*/g, "");
}

/**
* Extracts note metadata from ENEX files.
* Parses to GenerateNoteHeader() to get the final HTML output string.
*
* @param {HTMLElement} Note Content of the entire note, after being parsed as DOM.
* @returns {string} - HTML string with note metadata.
*/
export function ParseNoteMetadata(Note: HTMLElement): string {
  // Get child elements from metadata block.
  let MetadataNodes: HTMLElement[] = Note.querySelectorAll(`
    title,
    created,
    updated,
    note-attributes,
    author,
    reminder-time,
    reminder-order
  `);
  if (!MetadataNodes) throw new Error("Error: Unable to find and/or parse note metadata!");

  // Parse metadata & tags from querySelector result.
  let NoteTags: HTMLElement[] = Note.querySelectorAll("tag") || ["-"];
  let NoteMetadata: NoteMetadata = {
    NoteTitle: MetadataNodes.find(El => (El.tagName.toLowerCase()) === "title")?.textContent || "-",
    Author: MetadataNodes.find(El => (El.tagName.toLowerCase()) === "author")?.textContent || "-",
    CreatedDate: MetadataNodes.find(El => (El.tagName.toLowerCase()) === "created")?.textContent || "-",
    UpdatedDate: MetadataNodes.find(El => (El.tagName.toLowerCase()) === "updated")?.textContent || "-",
    ReminderTime: MetadataNodes.find(El => (El.tagName.toLowerCase()) === "reminder-time")?.textContent || "-",
    ReminderOrder: MetadataNodes.find(El => (El.tagName.toLowerCase()) === "reminder-order")?.textContent || "-",
    Tags: NoteTags.map((El) => El.textContent) || [''],
  }
  return GenerateNoteHeader(NoteMetadata)
}

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
    const ElementHash: string = MediaEl.getAttribute("hash") || '';
    const AttributeString = BuildMediaAttributes(MediaEl);
    HTMLOutput = (ResourceLookupTable[ElementHash])
      ? `<img src="data:${MediaType};base64, ${ResourceLookupTable[ElementHash]}"${AttributeString || ' alt="Embedded Image"'} />`
      : MediaPlaceholderEl;
  }
  return HTMLOutput;
}

/**
* Converts data from <task> nodes into styled HTML strings.
*
* @param {HTMLElement} Note Entire note content as DOM, including tasks, reminders, etc.
* @returns {string} - Converted HTML string with task metadata.
*/
export function TasksHandler(Note: HTMLElement): string | null {
  // Get child elements from metadata block.
  let HTMLOutput: string = "";
  let TaskNodes: HTMLElement[] | null = Note.querySelectorAll(`task`) || null;
  if (!TaskNodes) return TaskNodes;

  TaskNodes.forEach((TaskEl: HTMLElement) => {
    let ReminderNodes: Array<string> = [];

    // Extract reminder dates (if any).
    TaskEl.querySelectorAll("reminder")
      .forEach((ReminderNode: HTMLElement) => {
        ReminderNodes.push(
          FormatENEXDate((ReminderNode.querySelector("reminderdate")?.textContent) || 'Undated') || ''
        )
      })

    // Extract the rest of the metadata.
    let TaskMetadata: TaskMetadata = {
      TaskTitle: TaskEl.querySelector("title")?.textContent.trim() || "-",
      Status: ((TaskEl.querySelector("taskstatus")?.textContent) === "completed") ? 'completed' : 'open',
      Flagged: (TaskEl.querySelector("taskflag")?.textContent === "true") ? true : false,
      Recurrence: TaskEl.querySelector("recurrence")?.textContent,
      DueDate: FormatENEXDate(TaskEl.querySelector("duedate")?.textContent || 'Undated'),
      Description: undefined,
      Reminders: (ReminderNodes.length) ? ReminderNodes : undefined,
      ReminderTimezone: TaskEl.querySelector("timezone")?.textContent
    }
    HTMLOutput += GenerateTaskEl(TaskMetadata);
  })
  return HTMLOutput;
}

/**
* Extracts properties and inner content of Evernote callout elements,
* passes to GenerateCalloutEl() to create final HTML string.
*
* @param {HTMLElement} CalloutBlock Entire callout block as an HTMLElement.
* @returns {string} - HTML string, complete, styles task block.
*/
export function CalloutHandler(CalloutBlock: HTMLElement): string {
  let CalloutContents: string = '';
  (CalloutBlock.querySelectorAll("*")).forEach((El) => { CalloutContents += El.toString() });
  const Properties = ExtractENProperties(CalloutBlock.getAttribute('style'));
  return GenerateCalloutEl(Properties, CalloutContents);
}
