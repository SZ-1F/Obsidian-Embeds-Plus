/**
 * Logic for EN-specific elements that need custom handling.
 */

import { HTMLElement } from "node-html-parser";

// Define a placeholder element to display for unknown element types.
export const PlaceholderEl: string = `<div class="en-block-unsupported"><p>This element is not currently supported in Embeds+</p></div>`;
export const MediaPlaceholderEl: string = `<div class="en-block-unsupported-media"><p>Unsupported attachment</p></p></div>`;


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

export function MediaHandler(MediaEl: HTMLElement, ResourceLookupTable: Record<string, string>): string | null {
  // Check if the element is an image.
  if (MediaEl.getAttribute("type") === "image/png") {
    const ElementHash: string = MediaEl.getAttribute("hash") || '';
    let HTMLOutput: string = `
      <img src="data:image/png;base64, ${ResourceLookupTable[ElementHash] || null}" alt="Embedded Image" />
    `
    return HTMLOutput;
  }
  return MediaPlaceholderEl;
}