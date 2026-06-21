import { HTMLElement } from "node-html-parser";
import { TaskMetadata, FormatENEXDate, EscapeHTMLAttribute } from "../LibENEXHelpers";

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
      <div class="en-task-title">${EscapeHTMLAttribute(TaskMetadata.TaskTitle)}</div>
      <div class="en-task-date">${TaskMetadata.DueDate || ""}</div>
      <div class="en-task-metadata">
        <span class="en-task-recurrence">${EscapeHTMLAttribute(TaskMetadata.Recurrence || "")}</span>
        <span class="en-task-flag">${(TaskMetadata.Flagged) === true ? "true" : ""}</span>
        <span class="en-task-reminder">${(TaskMetadata.Reminders) ? "true" : ""}</span>
      </div>
    </div>
  `.replace(/\n\s*/g, "");
  return TaskEl;
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
      ?.forEach((ReminderNode: HTMLElement) => {
        try {
          const ReminderDateRaw: string = ReminderNode
            .querySelector("reminderdate")
            ?.textContent || "Undated";
          const ReminderDateFormatted = FormatENEXDate(ReminderDateRaw) || "Undated";
          ReminderNodes.push(ReminderDateFormatted);
        }
        catch (e) {
          const Message = e instanceof Error ? e.message : String(e);
          console.debug(`Failed to parse reminder date:${Message}`);
        }
      });

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
