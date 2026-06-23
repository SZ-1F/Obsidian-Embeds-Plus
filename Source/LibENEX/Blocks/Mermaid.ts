import { HTMLElement } from 'node-html-parser';
import { loadMermaid } from 'obsidian';
import { RootLog } from 'Source/Logger';

let ModuleLog = RootLog.getSubLogger({
  name: "ENEX-MERMAID",
});
/**
* Extracts the inner Mermaid source, and renders the diagram as an SVG
* using Obsidian's built-in Mermaid rendering.
*
* @param {HTMLElement} MermaidBlock Entire Mermaid block as an HTMLElement.
* @returns {Promise<string>} - HTML string for the parsed Mermaid diagram SVG.
*/
export async function MermaidHandler(MermaidBlock: HTMLElement): Promise<string> {
  // Extract the child <div> elements, construct a plain Mermaid string.
  ModuleLog.trace(`Extracting Mermaid source from block...`);
  const Source = (function () {
    let ExtractedMermaid: string = ``;
    MermaidBlock
      .querySelectorAll("div")
      .forEach((Child: HTMLElement) => {
        ExtractedMermaid += `${Child.innerText}\n`
      });
    return ExtractedMermaid;
  })();
  // Pass the source string to Obsidian's Mermaid handler.
  try {
    ModuleLog.trace(`Invoking Obsidian Mermaid renderer...`);
    const Mermaid = await loadMermaid() as { render: (id: string, source: string) => Promise<{ svg: string }> };
    const Result: { svg: string } = await Mermaid.render('mermaid-diagram', Source);
    ModuleLog.trace(`Successfully rendered Mermaid diagram`);
    return Result.svg;
  }
  catch (e) {
    const Message: string = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to load Mermaid: ${Message}`);
  }
}