/**
 * Exports CSS used for rendering ENML blocks as they would appear
 * in Evernote's editor. Injected into the final HTML output.
*/

export const ENCSS: string = `
  /* =============================================================================
     1. WEB FONTS
     ============================================================================= */

  @import url('https://fonts.googleapis.com/css?family=Source+Serif+Pro:400,600,700|Zilla+Slab:400,600,700|Dancing+Script:400,700|Kalam:300,400,700|Fira+Code&display=fallback');

  @font-face {
      font-display: fallback;
      font-family: Inter;
      font-stretch: 50% 200%;
      font-style: normal;
      font-weight: 1 999;
      src: url(images/InterVariable.c504db5c06caaf7cdfba.woff2) format('woff2-variations');
      unicode-range: u+0000-017f, u+0180-024f, u+1e??;
  }


  /* =============================================================================
     2. CSS CUSTOM PROPERTIES
     ============================================================================= */

  :root {
      --radius-xs: 4px;
      --spacing-0-25: 2px;
      --spacing-0-5: 4px;
      --spacing-0-75: 6px;
      --spacing-1: 8px;
      --spacing-1-25: 10px;
      --spacing-1-5: 12px;
      --spacing-2: 16px;
      --spacing-2-5: 20px;
      --spacing-3: 24px;
      --spacing-3-5: 28px;
      --spacing-4: 32px;
      --spacing-5: 40px;
      --spacing-6: 48px;
  }

  :root {
      --colors-grey-8: #141414;
      --colors-grey-10: #1a1a1a;
      --colors-grey-15: #262626;
      --colors-grey-25: #41403f;
      --colors-grey-30: #4e4d4c;
      --colors-grey-80: #cdcccb;
      --colors-grey-85: #dad9d8;
      --colors-grey-95: #f3f2f1;
      --colors-grey-97: #f9f8f8;
      --colors-grey-100: #fff;
      --colors-secondary-blue-300: #7c8eff;
      --colors-secondary-blue-400: #4d64ff;
      --colors-secondary-red-300: #f37e74;
      --colors-secondary-red-400: #e54e40;
      --default-font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
  }

  body {
      --color-background-fill-primary: var(--colors-grey-100);
      --color-surface-fill-secondary-enabled: var(--colors-grey-97);
      --color-surface-fill-tertiary-enabled: var(--colors-grey-95);
      --color-surface-stroke-tertiary-enabled: var(--colors-grey-85);
      --color-icon-fill-tertiary-enabled: var(--colors-grey-30);
      --color-text-fill-primary-code: var(--colors-secondary-red-400);
      --color-text-fill-primary-enabled: var(--colors-grey-8);
      --color-surface-fill-secondarybrand-enabled: var(--colors-secondary-blue-400);
  }

  body.darkMode {
      --color-background-fill-primary: var(--colors-grey-8);
      --color-surface-fill-secondary-enabled: var(--colors-grey-10);
      --color-surface-fill-tertiary-enabled: var(--colors-grey-15);
      --color-surface-stroke-tertiary-enabled: var(--colors-grey-25);
      --color-icon-fill-tertiary-enabled: var(--colors-grey-80);
      --color-text-fill-primary-code: var(--colors-secondary-red-300);
      --color-text-fill-primary-enabled: var(--colors-grey-100);
      --color-surface-fill-secondarybrand-enabled: var(--colors-secondary-blue-300);
  }


  /* =============================================================================
     3. BASE RESETS
     ============================================================================= */

  * {
      box-sizing: border-box;
  }

  body ::selection {
      background: rgba(33, 133, 231, .3);
  }

  body ::-moz-selection {
      background: rgba(33, 133, 231, .3);
  }

  body.darkMode ::selection {
      background: rgba(33, 133, 231, .25);
  }

  body.darkMode ::-moz-selection {
      background: rgba(33, 133, 231, .25);
  }

  a {
      color: #00e;
  }

  body.darkMode a {
      color: #66b3da;
  }


  /* =============================================================================
     4. BODY BASE
     ============================================================================= */

  body {
      color: #333;
      font-family: var(--default-font-family);
      text-rendering: optimizeLegibility;
      padding: 20px;
      border-radius: 20px;
  }

  body.darkMode {
      color: #e6e6e6;
      text-rendering: optimizeLegibility;
  }


  /* =============================================================================
     5. EN-NOTE CONTAINER
     ============================================================================= */

  en-note {
      background-color: var(--color-background-fill-primary);
      box-sizing: initial;
      color: #333;
      display: block;
      font-family: var(--default-font-family);
      font-feature-settings: "liga" 0, "calt";
      font-size: 15px;
      font-variant-ligatures: contextual;
      line-height: 1.45;
      outline: none;
      overflow-wrap: break-word;
      padding: 0 var(--spacing-6);
      position: relative;
      white-space: break-spaces;
      word-wrap: break-word;
  }

  en-note > :last-child {
      margin-bottom: 26px;
  }

  en-note > address,
  en-note > center,
  en-note > dd,
  en-note > div,
  en-note > dt,
  en-note > p {
      margin: 0;
      padding: 0;
  }

  en-note address,
  en-note center,
  en-note dd,
  en-note div,
  en-note dt,
  en-note p {
      line-height: 1.5;
  }

  en-note h1,
  en-note h2,
  en-note h3,
  en-note h4,
  en-note h5,
  en-note div {
      color: var(--textblock-lightmode-color, inherit);
  }

  body.darkMode en-note {
      background-color: var(--colors-grey-15);
      color: var(--color-text-fill-primary-enabled);
  }

  body.darkMode en-note h1,
  body.darkMode en-note h2,
  body.darkMode en-note h3,
  body.darkMode en-note h4,
  body.darkMode en-note h5,
  body.darkMode en-note div {
      color: var(--textblock-darkmode-color, inherit);
  }

  en-note .en-internal-link {
      color: var(--color-surface-fill-secondarybrand-enabled);
  }

  @media print {
      en-note {
          max-width: none !important;
          padding: 0 !important;
      }
  }


  /* =============================================================================
     6. HEADINGS AND HORIZONTAL RULE
     ============================================================================= */

  en-note > h1,
  en-note > h2,
  en-note > h3,
  en-note > h4,
  en-note > h5,
  en-note > h6 {
      margin: 12px 0 0;
      padding: 0;
  }

  en-note h1 {
      font-size: 30px;
      font-weight: 600;
      letter-spacing: -.5px;
      line-height: 1.3333;
      margin: 22px 0 var(--spacing-0-25);
      padding: 3px 0;
  }

  en-note h2 {
      font-size: 24px;
      font-weight: 600;
      letter-spacing: -.5px;
      line-height: 1.3333;
      margin: var(--spacing-2) 0 0;
      padding: 3px 0;
  }

  en-note h3,
  en-note h4,
  en-note h5,
  en-note h6 {
      font-size: 18px;
      font-weight: 600;
      letter-spacing: -.5px;
      line-height: 1.3333;
      margin: var(--spacing-2) 0 0;
      padding: 0;
  }

  en-note hr {
      border: none;
      border-bottom: thin solid var(--color-surface-stroke-tertiary-enabled);
      margin: 12px 0;
      padding: 0;
  }


  /* =============================================================================
     7. BLOCKQUOTE
     ============================================================================= */

  blockquote {
      border-left: var(--spacing-0-25) solid var(--color-icon-fill-tertiary-enabled);
      box-sizing: border-box;
      display: block;
      margin: var(--spacing-0-5) 0;
      min-width: 100px;
      padding-left: var(--spacing-2);
      position: relative;
  }


  /* =============================================================================
     8. LISTS
     ============================================================================= */

  en-note ul,
  en-note ol {
      margin: 0;
      padding: 0 0 0 var(--spacing-3);
      position: relative;
  }

  en-note td > ul,
  en-note td > ol {
      padding-left: var(--spacing-2);
  }

  en-note li {
      margin: var(--spacing-0-5) 0;
      position: relative;
  }

  en-note li h1,
  en-note li h2,
  en-note li h3,
  en-note li h4,
  en-note li h5,
  en-note li h6 {
      margin-block-end: 0;
      margin-block-start: 0;
  }

  en-note ul:not([style*="--en-todo"]) {
      list-style-type: disc;
  }

  en-note ul:not([style*="--en-todo"]) ul:not([style*="--en-todo"]) {
      list-style-type: circle;
  }

  en-note ol {
      list-style-type: decimal;
  }

  en-note ol ol {
      list-style-type: lower-alpha;
  }

  en-note ol ol,
  en-note ol ul,
  en-note ul ol,
  en-note ul ul {
      padding-left: var(--spacing-3);
  }


  /* =============================================================================
     9. CHECKLISTS
     ============================================================================= */

  en-note ul[style*="--en-todo:true"] {
      list-style: none;
      padding-left: 0;
  }

  en-note ul[style*="--en-todo:true"] > li {
      padding-left: 26px;
  }

  en-note ul[style*="--en-todo:true"] > li::before {
      background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PHBhdGggc3Ryb2tlPSIjQTZBNkE2IiBzdHJva2Utd2lkdGg9IjEuMjUiIGQ9Ik0yLjI5MyAzLjk0YzAtLjkxLjczOC0xLjY0OSAxLjY0OC0xLjY0OWgxMi4xMmMuOTEgMCAxLjY0OS43MzggMS42NDkgMS42NDhWMTYuMDZjMCAuOTEtLjczOCAxLjY0OC0xLjY0OCAxLjY0OEgzLjk0Yy0uOTEgMC0xLjY0OC0uNzM4LTEuNjQ4LTEuNjQ4VjMuOTRaIi8+PC9zdmc+");
      background-repeat: no-repeat;
      background-size: 17px;
      content: "";
      height: 17px;
      left: 0;
      position: absolute;
      top: calc((1.5em - 17px) / 2);
      width: 17px;
  }

  body.darkMode en-note ul[style*="--en-todo:true"] > li::before {
      background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PHBhdGggc3Ryb2tlPSIjNzM3MzczIiBzdHJva2Utd2lkdGg9IjEuMjUiIGQ9Ik0yLjI5MyAzLjk0YzAtLjkxLjczOC0xLjY0OSAxLjY0OC0xLjY0OWgxMi4xMmMuOTEgMCAxLjY0OS43MzggMS42NDkgMS42NDhWMTYuMDZjMCAuOTEtLjczOCAxLjY0OC0xLjY0OCAxLjY0OEgzLjk0Yy0uOTEgMC0xLjY0OC0uNzM4LTEuNjQ4LTEuNjQ4VjMuOTRaIi8+PC9zdmc+");
  }

  en-note ul[style*="--en-todo:true"] > li[style*="--en-checked:true"]::before {
      background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iIzRENjRGRiIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMy45NCAxLjY2N2EyLjI3MyAyLjI3MyAwIDAgMC0yLjI3MiAyLjI3MnYxMi4xMjJhMi4yNzMgMi4yNzMgMCAwIDAgMi4yNzMgMi4yNzJoMTIuMTJhMi4yNzMgMi4yNzMgMCAwIDAgMi4yNzQtMi4yNzJWMy45MzlhMi4yNzMgMi4yNzMgMCAwIDAtMi4yNzMtMi4yNzJIMy45NFptMTEuMDA1IDQuNjE2YS42ODIuNjgyIDAgMCAwLS45NjIuMDdsLTUuMDE1IDUuNzkzLTIuMDg1LTIuNDFhLjY4Mi42ODIgMCAxIDAtMS4wMzIuODkzbDIuNjAyIDMuMDA1YS42ODIuNjgyIDAgMCAwIDEuMDMgMGw1LjUzLTYuMzlhLjY4Mi42ODIgMCAwIDAtLjA2OC0uOTYxWiIgY2xpcC1ydWxlPSJldmVub2RkIi8+PC9zdmc+");
  }

  en-note ul[style*="--en-todo:true"] > li[style*="--en-checked:true"] > div {
      opacity: .55;
  }

  en-note ul[style*="--en-todo:true"] ul[style*="--en-todo:true"] {
      padding-left: 26px;
  }

  .en-todo {
      -moz-appearance: none;
      -webkit-appearance: none;
      appearance: none;
      background-color: transparent;
      border-width: 0;
      display: inline-block;
      font-size: 16px;
      height: 20px;
      margin: 0;
      outline-color: transparent;
      padding: 0 .25em;
      position: relative;
      -moz-user-select: all;
      -webkit-user-select: all;
      user-select: all;
      vertical-align: text-top;
      width: 20px;
  }

  .en-todo:before {
      background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PHBhdGggc3Ryb2tlPSIjQTZBNkE2IiBzdHJva2Utd2lkdGg9IjEuMjUiIGQ9Ik0yLjI5MyAzLjk0YzAtLjkxLjczOC0xLjY0OSAxLjY0OC0xLjY0OWgxMi4xMmMuOTEgMCAxLjY0OS43MzggMS42NDkgMS42NDhWMTYuMDZjMCAuOTEtLjczOCAxLjY0OC0xLjY0OCAxLjY0OEgzLjk0Yy0uOTEgMC0xLjY0OC0uNzM4LTEuNjQ4LTEuNjQ4VjMuOTRaIi8+PC9zdmc+");
      background-repeat: no-repeat;
      background-size: 20px;
      bottom: 0;
      content: "";
      display: inline-block;
      left: 0;
      position: absolute;
      right: 0;
      top: 0;
  }

  .en-todo[checked=true]:before {
      background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iIzRENjRGRiIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNNSAzYTIgMiAwIDAgMC0yIDJ2MTRhMiAyIDAgMCAwIDIgMmgxNGEyIDIgMCAwIDAgMi0yVjVhMiAyIDAgMCAwLTItMkg1Wm0zIDVhLjc1Ljc1IDAgMCAxIDEuMDYgMGwyLjk3IDIuOTdMMTUgOGEuNzUuNzUgMCAwIDEgMS4wNiAxLjA2bC0yLjk2OSAyLjk3IDIuOTcgMi45N0EuNzUuNzUgMCAwIDEgMTUgMTYuMDZsLTIuOTctMi45NjktMi45NyAyLjk3QS43NS43NSAwIDEgMSA4IDE1bDIuOTctMi45N0w4IDkuMDZBLjc1Ljc1IDAgMCAxIDggOFoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg==");
      background-position: 50%;
      background-size: 22px;
  }


  /* =============================================================================
     10. FONT FAMILY CLASSES
     ============================================================================= */

  en-note .vJdEy {
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
  }

  en-note h1 .vJdEy { font-weight: 600; }
  en-note h1 .vJdEy b { font-weight: 700; }
  en-note h2 .vJdEy { font-weight: 400; }
  en-note h2 .vJdEy b,
  en-note h3 .vJdEy,
  en-note h4 .vJdEy,
  en-note h5 .vJdEy,
  en-note h6 .vJdEy { font-weight: 600; }
  en-note h3 .vJdEy b,
  en-note h4 .vJdEy b,
  en-note h5 .vJdEy b,
  en-note h6 .vJdEy b { font-weight: 700; }

  en-note .PzcDn {
      font-family: "Source Serif Pro", serif;
  }

  en-note h1 .PzcDn { font-weight: 600; }
  en-note h1 .PzcDn b { font-weight: 700; }
  en-note h2 .PzcDn { font-weight: 400; }
  en-note h2 .PzcDn b,
  en-note h3 .PzcDn,
  en-note h4 .PzcDn,
  en-note h5 .PzcDn,
  en-note h6 .PzcDn { font-weight: 600; }
  en-note h3 .PzcDn b,
  en-note h4 .PzcDn b,
  en-note h5 .PzcDn b,
  en-note h6 .PzcDn b { font-weight: 700; }

  en-note .I87I1 {
      font-family: "Zilla Slab", serif, slab-serif;
  }

  en-note h1 .I87I1 { font-weight: 600; }
  en-note h1 .I87I1 b { font-weight: 700; }
  en-note h2 .I87I1 { font-weight: 400; }
  en-note h2 .I87I1 b { font-weight: 600; }
  en-note h3 .I87I1,
  en-note h4 .I87I1,
  en-note h5 .I87I1,
  en-note h6 .I87I1 { font-size: 20px; font-weight: 600; }
  en-note h3 .I87I1 b,
  en-note h4 .I87I1 b,
  en-note h5 .I87I1 b,
  en-note h6 .I87I1 b { font-weight: 700; }

  en-note .O_pm7 {
      font-family: "Fira Code", Consolas, Monaco, "Andale Mono", "Ubuntu Mono", "Courier New", monospace;
      letter-spacing: -.01em;
  }

  en-note h1 .O_pm7 { font-weight: 600; }
  en-note h1 .O_pm7 b { font-weight: 700; }
  en-note h2 .O_pm7 { font-weight: 400; }
  en-note h2 .O_pm7 b,
  en-note h3 .O_pm7,
  en-note h4 .O_pm7,
  en-note h5 .O_pm7,
  en-note h6 .O_pm7 { font-weight: 600; }
  en-note h3 .O_pm7 b { font-weight: 700; }

  en-note .to9US {
      font-family: "Dancing Script", cursive, script;
  }

  en-note h1 .to9US,
  en-note h2 .to9US,
  en-note h3 .to9US,
  en-note h4 .to9US,
  en-note h5 .to9US,
  en-note h6 .to9US { font-weight: 400; }
  en-note h1 .to9US b,
  en-note h2 .to9US b,
  en-note h3 .to9US b,
  en-note h4 .to9US b,
  en-note h5 .to9US b,
  en-note h6 .to9US b { font-weight: 700; }

  en-note .WvEwz {
      font-family: Kalam, cursive, handwritten;
      font-weight: 300;
      letter-spacing: -.01em;
  }

  en-note .WvEwz b,
  en-note h1 .WvEwz { font-weight: 400; }
  en-note h1 .WvEwz b { font-weight: 700; }
  en-note h2 .WvEwz { font-weight: 300; }
  en-note h2 .WvEwz b,
  en-note h3 .WvEwz,
  en-note h4 .WvEwz,
  en-note h5 .WvEwz,
  en-note h6 .WvEwz { font-weight: 400; }
  en-note h3 .WvEwz b,
  en-note h4 .WvEwz b,
  en-note h5 .WvEwz b,
  en-note h6 .WvEwz b { font-weight: 700; }


  /* =============================================================================
     11. INLINE TEXT FORMATTING
     ============================================================================= */

  en-note code {
      background-color: var(--color-surface-fill-tertiary-enabled);
      border: 0;
      border-radius: 3px;
      color: var(--color-text-fill-primary-code);
      display: inline;
      font-family: "Fira Code", Consolas, Monaco, "Andale Mono", "Ubuntu Mono", "Courier New", monospace;
      font-size: 14px;
      font-style: normal;
      font-weight: 400;
      margin: 0;
      padding: 2px 4px;
      text-decoration: none;
      vertical-align: initial;
  }

  en-note .UrtAp {
      color: var(--lightmode-color);
  }

  body.darkMode en-note .UrtAp {
      color: var(--darkmode-color);
  }

  en-note .R64m3 {
      padding: 3px 0;
  }

  en-note .R64m3.zTQp5 { background-color: rgba(255, 219, 39, .45); }
  body.darkMode en-note .R64m3.zTQp5 { background-color: hsla(50, 74%, 72%, .45); }

  en-note .R64m3.nyVDb { background-color: rgba(253, 117, 151, .45); }
  body.darkMode en-note .R64m3.nyVDb { background-color: rgba(234, 167, 182, .45); }

  en-note .R64m3.OV29h { background-color: rgba(95, 237, 153, .45); }
  body.darkMode en-note .R64m3.OV29h { background-color: rgba(156, 227, 185, .45); }

  en-note .R64m3.vfGi6 { background-color: rgba(73, 213, 231, .45); }
  body.darkMode en-note .R64m3.vfGi6 { background-color: rgba(145, 214, 222, .45); }

  en-note .R64m3.hKQev { background-color: rgba(139, 137, 255, .45); }
  body.darkMode en-note .R64m3.hKQev { background-color: rgba(178, 176, 236, .45); }

  en-note .R64m3.ZvszV { background-color: rgba(255, 153, 79, .45); }
  body.darkMode en-note .R64m3.ZvszV { background-color: hsla(25, 70%, 75%, .45); }


  /* =============================================================================
     12. CODE BLOCKS
     ============================================================================= */

  en-note div[style*="--en-codeblock:true"] {
      border-radius: var(--radius-xs);
      font-family: "Fira Code", Consolas, Monaco, "Andale Mono", "Ubuntu Mono", "Courier New", monospace;
      font-size: 14px;
      padding: var(--spacing-1-5);
      white-space: pre-wrap;
  }

  body.darkMode en-note div[style*="--en-codeblock:true"] {
      background-color: var(--color-surface-fill-secondary-enabled) !important;
      border-color: transparent !important;
      color: var(--color-text-fill-primary-enabled) !important;
  }

  en-note div[style*="--en-mermaidblock:true"] {
      border-radius: var(--radius-xs);
      font-family: "Fira Code", Consolas, Monaco, "Andale Mono", "Ubuntu Mono", "Courier New", monospace;
      font-size: 14px;
      padding: var(--spacing-1-5);
      white-space: pre-wrap;
  }

  body.darkMode en-note div[style*="--en-mermaidblock:true"] {
      background-color: var(--color-surface-fill-secondary-enabled) !important;
      border-color: transparent !important;
      color: var(--color-text-fill-primary-enabled) !important;
  }


  /* =============================================================================
     13. TABLES
     ============================================================================= */

  en-note table {
      max-width: 100%;
  }

  /* =============================================================================
     14. UNSUPPORTED BLOCK
     ============================================================================= */

  .en-block-unsupported {
      display: flex;
      align-items: center;
      gap: var(--spacing-1);
      padding: var(--spacing-1) var(--spacing-1-5);
      border: 1px solid rgba(229, 78, 64, 0.3);
      border-radius: var(--radius-xs);
      background-color: rgba(229, 78, 64, 0.06);
      color: var(--colors-secondary-red-400);
      font-size: 13px;
      font-weight: 500;
  }

  /* =============================================================================
     15. NOTE PROPERTIES
     ============================================================================= */

  .en-block-unsupported::before {
      content: "";
      display: block;
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      background-image: url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 24 24' fill='%23e54e40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M19.7251 20C20.181 20 20.6011 19.756 20.829 19.36C21.057 18.964 21.057 18.476 20.829 18.08L13.1031 4.63999C12.876 4.24399 12.4551 4 12 4C11.5449 4 11.124 4.24399 10.8961 4.63999L3.17098 18.08C2.94301 18.476 2.94301 18.964 3.17098 19.36C3.3981 19.756 3.81893 20 4.27408 20H19.7251ZM4.86489 18.4L12 5.98798L19.1351 18.4H4.86489Z'/%3E%3Cpath d='M12.75 10.5752C12.75 10.161 12.4142 9.82523 12 9.82523C11.5858 9.82523 11.25 10.161 11.25 10.5752V13.2979C11.25 13.7121 11.5858 14.0479 12 14.0479C12.4142 14.0479 12.75 13.7121 12.75 13.2979V10.5752Z'/%3E%3Cpath d='M12.875 15.9511C12.875 16.4344 12.4832 16.8261 12 16.8261C11.5168 16.8261 11.125 16.4344 11.125 15.9511C11.125 15.4679 11.5168 15.0761 12 15.0761C12.4832 15.0761 12.875 15.4679 12.875 15.9511Z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-size: 16px;
  }

  body.darkMode .en-block-unsupported {
      border-color: rgba(243, 126, 116, 0.3);
      background-color: rgba(243, 126, 116, 0.06);
      color: var(--colors-secondary-red-300);
  }

  body.darkMode .en-block-unsupported::before {
      background-image: url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 24 24' fill='%23f37e74' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M19.7251 20C20.181 20 20.6011 19.756 20.829 19.36C21.057 18.964 21.057 18.476 20.829 18.08L13.1031 4.63999C12.876 4.24399 12.4551 4 12 4C11.5449 4 11.124 4.24399 10.8961 4.63999L3.17098 18.08C2.94301 18.476 2.94301 18.964 3.17098 19.36C3.3981 19.756 3.81893 20 4.27408 20H19.7251ZM4.86489 18.4L12 5.98798L19.1351 18.4H4.86489Z'/%3E%3Cpath d='M12.75 10.5752C12.75 10.161 12.4142 9.82523 12 9.82523C11.5858 9.82523 11.25 10.161 11.25 10.5752V13.2979C11.25 13.7121 11.5858 14.0479 12 14.0479C12.4142 14.0479 12.75 13.7121 12.75 13.2979V10.5752Z'/%3E%3Cpath d='M12.875 15.9511C12.875 16.4344 12.4832 16.8261 12 16.8261C11.5168 16.8261 11.125 16.4344 11.125 15.9511C11.125 15.4679 11.5168 15.0761 12 15.0761C12.4832 15.0761 12.875 15.4679 12.875 15.9511Z'/%3E%3C/svg%3E");
  }

  en-note .en-note-title {
      margin-top: 0;
  }

  .en-properties-header {
      display: flex;
      flex-direction: column;
      outline: 1px solid var(--color-surface-stroke-tertiary-enabled);
      border-radius: var(--radius-xs);
  }

  .en-meta-row::before,
  .en-properties-tags::before {
      content: "";
      display: block;
      flex-shrink: 0;
      width: 13px;
      height: 13px;
      background-repeat: no-repeat;
      background-size: 13px;
  }

  .en-meta-author::before {
      background-image: url("data:image/svg+xml,%3Csvg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%234e4d4c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E");
  }

  .en-meta-created::before {
      background-image: url("data:image/svg+xml,%3Csvg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%234e4d4c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='3' y='4' width='18' height='18' rx='2' ry='2'/%3E%3Cline x1='16' y1='2' x2='16' y2='6'/%3E%3Cline x1='8' y1='2' x2='8' y2='6'/%3E%3Cline x1='3' y1='10' x2='21' y2='10'/%3E%3C/svg%3E");
  }

  .en-meta-updated::before {
      background-image: url("data:image/svg+xml,%3Csvg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%234e4d4c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpolyline points='12 6 12 12 16 14'/%3E%3C/svg%3E");
  }

  .en-properties-tags::before {
      background-image: url("data:image/svg+xml,%3Csvg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%234e4d4c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z'/%3E%3Cline x1='7' y1='7' x2='7.01' y2='7'/%3E%3C/svg%3E");
  }

  body.darkMode .en-meta-author::before {
      background-image: url("data:image/svg+xml,%3Csvg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%23cdcccb' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E");
  }

  body.darkMode .en-meta-created::before {
      background-image: url("data:image/svg+xml,%3Csvg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%23cdcccb' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='3' y='4' width='18' height='18' rx='2' ry='2'/%3E%3Cline x1='16' y1='2' x2='16' y2='6'/%3E%3Cline x1='8' y1='2' x2='8' y2='6'/%3E%3Cline x1='3' y1='10' x2='21' y2='10'/%3E%3C/svg%3E");
  }

  body.darkMode .en-meta-updated::before {
      background-image: url("data:image/svg+xml,%3Csvg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%23cdcccb' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpolyline points='12 6 12 12 16 14'/%3E%3C/svg%3E");
  }

  body.darkMode .en-properties-tags::before {
      background-image: url("data:image/svg+xml,%3Csvg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%23cdcccb' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z'/%3E%3Cline x1='7' y1='7' x2='7.01' y2='7'/%3E%3C/svg%3E");
  }

  .en-properties-metadata {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-0-75);
      padding: var(--spacing-1);
      font-size: 13px;
      color: var(--color-icon-fill-tertiary-enabled);
  }

  .en-meta-row {
      display: flex;
      align-items: center;
      white-space: normal;
      gap: var(--spacing-1);
  }

  .en-meta-row > svg {
      flex-shrink: 0;
      display: block;
  }

  .en-properties-tags {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--spacing-0-75);
      padding: var(--spacing-1);
  }

  .en-properties-tags > .tag {
      outline: 1px solid var(--color-surface-stroke-tertiary-enabled);
      color: inherit;
      border-radius: var(--radius-xs);
      padding: var(--spacing-0-25) var(--spacing-1-25);
      font-size: 12px;
  }

`;
