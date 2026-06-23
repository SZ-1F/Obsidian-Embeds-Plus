import { HTMLElement } from "node-html-parser";
import { ExtractENProperties } from "../LibENEXHelpers";
import { RootLog } from 'Source/Logger';

let ModuleLog = RootLog.getSubLogger({
  name: "ENEX-CALLOUTS",
});

/**
* Generates a HTML block for callout elements that is injected into DOM for rendering.
*
* @param {Map<string, string>} Properties Callout properties, i.e, color, emoji, and content.
* @param {string} Contents Inner HTML content from the callout block.
* @returns {string} - HTML string, complete, styles task block.
*/
export const GenerateCalloutEl = (Properties: Map<string, string>, Contents: string): string => {
  let CalloutEl: string = `
    <div class="en-callout en-callout-${Properties.get('--en-color') || 'plain'}">
      <div class="en-callout-emoji">${Properties.get('--en-emoji') || '?'}</div>
      <div class="en-callout-content">
        ${Contents}
      </div>
    </div>
  `.replace(/\n\s*/g, "");
  return CalloutEl;
}

/**
* Extracts properties and inner content of Evernote callout elements,
* passes to GenerateCalloutEl() to create final HTML string.
*
* @param {HTMLElement} CalloutBlock Entire callout block as an HTMLElement.
* @returns {string} - HTML string, complete, styled task block.
*/
export function CalloutHandler(CalloutBlock: HTMLElement): string {
  ModuleLog.trace(`Extracting callout properties and inner content...`);
  let CalloutContents: string = '';
  (CalloutBlock.querySelectorAll("*")).forEach((El) => { CalloutContents += El.toString() });
  const Properties = ExtractENProperties(CalloutBlock.getAttribute('style'));
  ModuleLog.trace(`Generated callout element with colour: ${Properties.get('--en-color') || 'plain'}`);
  return GenerateCalloutEl(Properties, CalloutContents);
}