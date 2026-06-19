import { HTMLElement } from 'node-html-parser';
import { loadMathJax } from 'obsidian';
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
  await loadMathJax();
  const MathJaxInstance = (window as Window & { MathJax?: MathJaxApi }).MathJax;

  if ((!MathJaxInstance) || (!MathJaxInstance.tex2mml)) {
    throw new Error('MathJax tex2mml() is unavailable.');
  }
  const El = MathJaxInstance
    .tex2mml(Source, { display: IsBlock }) || "Error rendering math block.";
  return El;
}