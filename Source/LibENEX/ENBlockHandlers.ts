/**
 * Logic for EN-specific elements that need custom handling.
 */

import { HTMLElement } from "node-html-parser";
import { PlaceholderEl, MediaPlaceholderEl } from 'Source/Constants';

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
* Converts date formats used in ENEX files to a human-readable format.
*
* @param {string} RawTimeString Raw date/time string.
* @param {string} Timezone Desired timezone.
* @returns {string} - Date & time as a readable string.
*/
const FormatENEXDate = (RawTimeString:string, Timezone="UTC") => {
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
    <h1 class="en-note-title">${NoteMetadata.NoteTitle}</h1>
    <div class="en-properties-header">
      <div class="en-properties-metadata">
        <span class="en-meta-row en-meta-author">${NoteMetadata.Author || "-"}</span>
        <span class="en-meta-row en-meta-created"><b>Created:</b> ${NoteMetadata.CreatedDate || "-"}</span>
        <span class="en-meta-row en-meta-updated"><b>Updated:</b> ${NoteMetadata.UpdatedDate || "-"}</span>
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
  if (MediaEl.getAttribute("type") === "image/png") {
    const ElementHash: string = MediaEl.getAttribute("hash") || '';
    HTMLOutput = (ResourceLookupTable[ElementHash])
      ? `<img src="data:image/png;base64, ${ResourceLookupTable[ElementHash]}" alt="Embedded Image" />`
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
          ReminderNode
            .querySelector("reminderdate")
            ?.textContent || "No Date"
        )
    })

    // Extract the rest of the metadata.
    let TaskMetadata: TaskMetadata = {
      TaskTitle: TaskEl.querySelector("title")?.textContent.trim() || "-",
      Status: ((TaskEl.querySelector("taskstatus")?.textContent) === "completed") ? 'completed' : 'open',
      Flagged: (TaskEl.querySelector("taskflag")?.textContent === "true") ? true : false,
      Recurrence: TaskEl.querySelector("recurrence")?.textContent,
      DueDate: TaskEl.querySelector("duedate")?.textContent,
      Description: undefined,
      Reminders: (ReminderNodes.length) ? ReminderNodes : undefined,
      ReminderTimezone: TaskEl.querySelector("timezone")?.textContent
    }
    console.debug(TaskMetadata)
    HTMLOutput += GenerateTaskEl(TaskMetadata);
  })
  return HTMLOutput;
}