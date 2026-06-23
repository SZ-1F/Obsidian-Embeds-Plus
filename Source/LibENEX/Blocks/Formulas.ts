import { HTMLElement } from 'node-html-parser';
import { loadMathJax } from 'obsidian';
import { RootLog } from 'Source/Logger';

let ModuleLog = RootLog.getSubLogger({
  name: "ENEX-FORMULAS",
});
/**
* Extracts the inner TeX formula markup and renders it as MathML
* using Obsidian's built-in MathJAX instance.
*
* @param {HTMLElement} FormulaBlock Entire TeX formula block as an HTMLElement.
* @param {Boolean} IsBlock True by default, can be adjusted to allow inline formulas.
* @returns {Promise<string>} - HTML string for the MathML markup.
*/
export async function FormulaHandler(FormulaBlock: HTMLElement, IsBlock: boolean = true): Promise<string> {
  // Extract the child <div> elements, construct a plain TeX formula string.
  ModuleLog.trace(`Extracting TeX formula source from block...`);
  const Source = (function () {
    let ExtractedFormula: string = ``;
    FormulaBlock
      .querySelectorAll("div")
      .forEach((Child: HTMLElement) => {
        ExtractedFormula += `${Child.innerText}\n`
      });
    return ExtractedFormula;
  })();
  type MathJaxApi = {
    tex2mml?: (Source: string, Options?: { display?: boolean }) => string;
  };

  // Try invoking Obsidian's native MathJAX.
  try {
    ModuleLog.trace(`Invoking Obsidian MathJax renderer...`);
    await loadMathJax();
    const MathJaxInstance = (window as Window & { MathJax?: MathJaxApi }).MathJax;
    if (!MathJaxInstance?.tex2mml) {
        throw new Error("Unable to load MathJAX!");
    }
    // Render the formula by converting TeX to MathML.
    const El = MathJaxInstance
      .tex2mml(Source, { display: IsBlock }) || "Error rendering math block.";
    ModuleLog.trace(`Successfully rendered formula as MathML`);
    return El;
  }
  catch (e) {
    const Message: string = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to parse formula: ${Message}`);
  }
}