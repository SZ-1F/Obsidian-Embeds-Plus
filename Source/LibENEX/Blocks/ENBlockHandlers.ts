/**
 * Logic for EN-specific elements that need custom handling.
 */

import { HTMLElement } from "node-html-parser";
import { NoteMetadata, GenerateNoteHeader } from "../LibENEXHelpers";
import { RootLog } from 'Source/Logger';

let ModuleLog = RootLog.getSubLogger({
  name: "ENEX-BLOCK-HANDLERS",
});

// Re-export individual block handlers.
export * from './Callouts';
export * from './Formulas';
export * from './Media';
export * from './Webclips';
export * from './Tasks';
export * from './Mermaid';

/**
* Extracts note metadata from ENEX files.
* Parses to GenerateNoteHeader() to get the final HTML output string.
*
* @param {HTMLElement} Note Content of the entire note, after being parsed as DOM.
* @returns {string} - HTML string with note metadata.
*/
export function ParseNoteMetadata(Note: HTMLElement): string {
  // Get child elements from metadata block.
  ModuleLog.trace(`Querying note metadata nodes...`);
  let MetadataNodes: HTMLElement[] = Note.querySelectorAll(`
    title,
    created,
    updated,
    note-attributes,
    author,
    reminder-time,
    reminder-order
  `);
  // No metadata found, return the fallback.
  if (!MetadataNodes) return GenerateNoteHeader();

  // Parse metadata & tags from querySelector result.
  let NoteTags: HTMLElement[] = Note.querySelectorAll("tag") || [];
  ModuleLog.trace(`Extracted ${NoteTags.length} tag(s) from note`);
  let NoteMetadata: NoteMetadata = {
    NoteTitle: MetadataNodes.find(El => (El.tagName.toLowerCase()) === "title")?.textContent || "Untitled",
    Author: MetadataNodes.find(El => (El.tagName.toLowerCase()) === "author")?.textContent || "Unknown",
    CreatedDate: MetadataNodes.find(El => (El.tagName.toLowerCase()) === "created")?.textContent || "Unknown",
    UpdatedDate: MetadataNodes.find(El => (El.tagName.toLowerCase()) === "updated")?.textContent || "Unknown",
    ReminderTime: MetadataNodes.find(El => (El.tagName.toLowerCase()) === "reminder-time")?.textContent || "None",
    ReminderOrder: MetadataNodes.find(El => (El.tagName.toLowerCase()) === "reminder-order")?.textContent || "None",
    Tags: NoteTags ? NoteTags.map((El) => El.textContent) : undefined,
  }
  ModuleLog.debug(`Successfully parsed note metadata for: ${NoteMetadata.NoteTitle}`);
  return GenerateNoteHeader(NoteMetadata);
}