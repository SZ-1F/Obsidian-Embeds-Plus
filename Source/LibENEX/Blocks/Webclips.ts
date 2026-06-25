import { HTMLElement, parse } from "node-html-parser";
import { EmbedIconSVGMarkup, OpenIconSVGMarkup } from 'Source/EmbedIcons';
import { MediaHandler } from "./Media";
import {
  NormaliseHeightStyle,
  ExtractENProperties,
  EscapeHTMLAttribute
} from "../LibENEXHelpers";
import { RootLog } from 'Source/Logger';

let ModuleLog = RootLog.getSubLogger({
  name: "ENEX-WEBCLIPS",
});

/**
* Prepares clipped HTML so it renders consistently inside the web clip frame.
*
* @param {HTMLElement} ClipBlock Root clipped content block.
* @param {Record<string, string>} ResourceLookupTable Resource lookup table keyed by media hash.
* @returns {void}
*/
export const PrepareWebClipContent = (
  ClipBlock: HTMLElement,
  ResourceLookupTable: Record<string, string>
): void => {
  ModuleLog.trace(`Preparing web clip content, processing embedded media and normalising styles...`);
  ClipBlock.querySelectorAll('en-media').forEach((MediaEl) => {
    const ParsedMedia = MediaHandler(MediaEl, ResourceLookupTable);
    MediaEl.replaceWith(parse(ParsedMedia));
  });

  ClipBlock.querySelectorAll('[style]').forEach((StyledEl) => {
    NormaliseHeightStyle(StyledEl);
  });
};

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
  ModuleLog.trace(`Processing web clip block with type: ${ClipType}`);
  ModuleLog.trace(`Source URL present: ${SourceURL ? 'yes' : 'no'}`);

  PrepareWebClipContent(ClipBlock, ResourceLookupTable);

  let ClipContents = '';
  ClipBlock.childNodes.forEach((Node) => {
    ClipContents += Node.toString();
  });

  const OpenSourceButton = SourceURL && /^https?:\/\//i.test(SourceURL)
    ? `<a class="en-web-clip-button html-embed-button html-embed-button-text" href="${EscapeHTMLAttribute(SourceURL)}" target="_blank" rel="noopener noreferrer"><span class="html-embed-button-icon">${OpenIconSVGMarkup}</span><span class="html-embed-button-label">Open Source URL</span></a>`
    : '';
  const Header = `<div class="en-web-clip-header html-embed-header"><div class="en-web-clip-header-left html-embed-header-left"><div class="html-embed-icon">${EmbedIconSVGMarkup}</div><div class="html-embed-filename">Web Clip</div></div><div class="en-web-clip-header-right html-embed-header-right">${OpenSourceButton}</div></div>`;

  ModuleLog.trace(`Generated web clip HTML output`);
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
