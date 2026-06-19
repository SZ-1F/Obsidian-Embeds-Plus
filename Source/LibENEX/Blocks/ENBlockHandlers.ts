/**
 * Logic for EN-specific elements that need custom handling.
 */

import { HTMLElement } from "node-html-parser";
import { NoteMetadata, GenerateNoteHeader } from "../LibENEXHelpers";

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