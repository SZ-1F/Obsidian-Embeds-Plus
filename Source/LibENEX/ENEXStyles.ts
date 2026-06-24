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

  .readableLine {
    max-width:75%;
    margin: auto;
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
      padding: var(--spacing-4);
      border-radius: 20px;
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

  body.darkMode en-note ul[style*="--en-todo:true"] > li[style*="--en-checked:true"]::before {
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
     11. INLINE TEXT FORMATTING & ATTACHMENTS
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

  en-note > img {
    max-width:100%;
  }

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

  .en-block-unsupported-media {
      display: flex;
      align-items: center;
      gap: var(--spacing-1);
      padding: var(--spacing-1) var(--spacing-1-5);
      border: 1px solid var(--color-surface-stroke-tertiary-enabled);
      border-radius: var(--radius-xs);
      background-color: var(--color-surface-fill-secondary-enabled);
      color: var(--color-icon-fill-tertiary-enabled);
      font-size: 13px;
      font-weight: 400;
  }

  .en-block-unsupported-media::before {
      content: "";
      display: block;
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      background-color: currentColor;
      -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21.44 11.05l-8.49 8.49a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.5 3.5 0 1 1 4.95 4.95l-9.2 9.19a1.5 1.5 0 0 1-2.12-2.12l8.49-8.48'/%3E%3C/svg%3E");
      -webkit-mask-repeat: no-repeat;
      -webkit-mask-size: 16px;
      -webkit-mask-position: center;
      mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21.44 11.05l-8.49 8.49a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.5 3.5 0 1 1 4.95 4.95l-9.2 9.19a1.5 1.5 0 0 1-2.12-2.12l8.49-8.48'/%3E%3C/svg%3E");
      mask-repeat: no-repeat;
      mask-size: 16px;
      mask-position: center;
  }

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

  /* =============================================================================
     15. NOTE PROPERTIES
     ============================================================================= */

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

  .en-properties-tags > .mutedText {
      color: inherit;
      opacity: 0.7;
      border-radius: var(--radius-xs);
      font-size: 12px;
  }

  .badge::before {
      content: "";
      display: inline-block;
      width: 13px;
      height: 13px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23cdcccb' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'/%3E%3Ccircle cx='12' cy='12' r='3'/%3E%3C/svg%3E");
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      vertical-align: middle;
  }

  body.darkMode .badge::before {
      content: "";
      display: inline-block;
      width: 13px;
      height: 13px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234e4d4c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'/%3E%3Ccircle cx='12' cy='12' r='3'/%3E%3C/svg%3E");
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      vertical-align: middle;
  }

  .badge {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-0-75);
      outline: 1px solid var(--color-surface-stroke-tertiary-enabled);
      color: inherit;
      border-radius: var(--radius-xs);
      padding: var(--spacing-0-25) var(--spacing-1-25);
      font-size: 12px;
      font-weight: bold;
  }

  .en-meta-error {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      align-self: center;
      gap: var(--spacing-1);
      max-width: 100%;
      margin: var(--spacing-0-75) auto;
      padding: var(--spacing-1) var(--spacing-1-5);
      color: var(--colors-secondary-red-400);
      font-size: 13px;
      font-weight: 500;
      line-height: 1.4;
      text-align: center;
      white-space: normal;
  }

  .en-meta-error::before {
      content: "";
      display: block;
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      background-color: currentColor;
      -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M19.7251 20C20.181 20 20.6011 19.756 20.829 19.36C21.057 18.964 21.057 18.476 20.829 18.08L13.1031 4.63999C12.876 4.24399 12.4551 4 12 4C11.5449 4 11.124 4.24399 10.8961 4.63999L3.17098 18.08C2.94301 18.476 2.94301 18.964 3.17098 19.36C3.3981 19.756 3.81893 20 4.27408 20H19.7251ZM4.86489 18.4L12 5.98798L19.1351 18.4H4.86489Z'/%3E%3Cpath d='M12.75 10.5752C12.75 10.161 12.4142 9.82523 12 9.82523C11.5858 9.82523 11.25 10.161 11.25 10.5752V13.2979C11.25 13.7121 11.5858 14.0479 12 14.0479C12.4142 14.0479 12.75 13.7121 12.75 13.2979V10.5752Z'/%3E%3Cpath d='M12.875 15.9511C12.875 16.4344 12.4832 16.8261 12 16.8261C11.5168 16.8261 11.125 16.4344 11.125 15.9511C11.125 15.4679 11.5168 15.0761 12 15.0761C12.4832 15.0761 12.875 15.4679 12.875 15.9511Z'/%3E%3C/svg%3E");
      -webkit-mask-repeat: no-repeat;
      -webkit-mask-size: 16px;
      -webkit-mask-position: center;
      mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M19.7251 20C20.181 20 20.6011 19.756 20.829 19.36C21.057 18.964 21.057 18.476 20.829 18.08L13.1031 4.63999C12.876 4.24399 12.4551 4 12 4C11.5449 4 11.124 4.24399 10.8961 4.63999L3.17098 18.08C2.94301 18.476 2.94301 18.964 3.17098 19.36C3.3981 19.756 3.81893 20 4.27408 20H19.7251ZM4.86489 18.4L12 5.98798L19.1351 18.4H4.86489Z'/%3E%3Cpath d='M12.75 10.5752C12.75 10.161 12.4142 9.82523 12 9.82523C11.5858 9.82523 11.25 10.161 11.25 10.5752V13.2979C11.25 13.7121 11.5858 14.0479 12 14.0479C12.4142 14.0479 12.75 13.7121 12.75 13.2979V10.5752Z'/%3E%3Cpath d='M12.875 15.9511C12.875 16.4344 12.4832 16.8261 12 16.8261C11.5168 16.8261 11.125 16.4344 11.125 15.9511C11.125 15.4679 11.5168 15.0761 12 15.0761C12.4832 15.0761 12.875 15.4679 12.875 15.9511Z'/%3E%3C/svg%3E");
      mask-repeat: no-repeat;
      mask-size: 16px;
      mask-position: center;
  }

  body.darkMode .en-meta-error {
      color: var(--colors-secondary-red-300);
  }

  /* =============================================================================
     16. TASKS
     ============================================================================= */

  .en-task {
    --en-task-bg: rgba(174, 174, 174, 0.09);
    --en-task-border: rgba(182, 182, 182, 0.14);
    --en-task-title-colour: #22222a;
    --en-task-muted-colour: #7a7a88;
    --en-task-icon-size: 24px;
    --en-task-meta-icon-size: 16px;
    --en-task-meta-icon-scale: 18px;
    --en-task-icon-open: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'><circle cx='11.9243' cy='12' r='8' fill='transparent'/><circle cx='11.9243' cy='12' r='8.5' fill='transparent'/><path fill-rule='evenodd' clip-rule='evenodd' d='M12 19.2917C16.027 19.2917 19.2916 16.0271 19.2916 12C19.2916 7.97291 16.027 4.70832 12 4.70832C7.97288 4.70832 4.70829 7.97291 4.70829 12C4.70829 16.0271 7.97288 19.2917 12 19.2917ZM12 20.3333C16.6023 20.3333 20.3333 16.6024 20.3333 12C20.3333 7.39762 16.6023 3.66666 12 3.66666C7.39759 3.66666 3.66663 7.39762 3.66663 12C3.66663 16.6024 7.39759 20.3333 12 20.3333Z' fill='%237c4dff'/></svg>");
    --en-task-icon-complete: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'><path d='M16.033 9.62529C16.2416 9.37251 16.2016 9.00193 15.9436 8.79756C15.6856 8.59318 15.3074 8.63242 15.0988 8.8852L10.9721 13.8865L8.84097 11.9627C8.59699 11.7424 8.21699 11.7577 7.9922 11.9967C7.76742 12.2358 7.78298 12.6081 8.02697 12.8284L10.6293 15.1776C10.7514 15.2879 10.9146 15.3436 11.0802 15.3318C11.2458 15.3199 11.399 15.2414 11.5034 15.1148L16.033 9.62529Z' fill='%237c4dff'/><path fill-rule='evenodd' clip-rule='evenodd' d='M20.3333 12C20.3333 16.6024 16.6023 20.3333 12 20.3333C7.39759 20.3333 3.66663 16.6024 3.66663 12C3.66663 7.39762 7.39759 3.66666 12 3.66666C16.6023 3.66666 20.3333 7.39762 20.3333 12ZM19.2916 12C19.2916 16.0271 16.027 19.2917 12 19.2917C7.97288 19.2917 4.70829 16.0271 4.70829 12C4.70829 7.97291 7.97288 4.70832 12 4.70832C16.027 4.70832 19.2916 7.97291 19.2916 12Z' fill='%237c4dff'/></svg>");
    --en-task-icon-recurrence: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none'><path fill-rule='evenodd' clip-rule='evenodd' d='M10.1652 2.48911L10.05 2.36714C9.45593 1.73783 8.71834 1.25114 7.8918 0.953674C6.61912 0.49564 5.22303 0.517718 3.96546 1.01576C2.70789 1.51381 1.67526 2.4536 1.06129 3.65882C0.447319 4.86405 0.2942 6.25188 0.630662 7.56197C0.967125 8.87205 1.77005 10.0144 2.88879 10.7746C4.00754 11.5348 5.36523 11.8607 6.70716 11.6911C8.04909 11.5215 9.28304 10.8682 10.1775 9.85356C10.7819 9.168 11.0165 8.65828 11.3508 7.68294C11.4186 7.48538 11.4208 7.29978 11.3516 7.14583C11.2819 6.99081 11.1443 6.87807 10.9532 6.81892C10.8063 6.77343 10.6518 6.78139 10.5105 6.86449C10.3707 6.9468 10.2516 7.09824 10.164 7.32511C9.92771 7.93661 9.68386 8.52184 9.23914 9.02629C8.54611 9.81241 7.59005 10.3186 6.55034 10.45C5.51062 10.5814 4.45868 10.3289 3.59189 9.73989C2.72509 9.15088 2.10299 8.26583 1.84231 7.25079C1.58162 6.23574 1.70025 5.16046 2.17595 4.22666C2.65165 3.29286 3.45173 2.56472 4.42609 2.17884C5.40044 1.79295 6.48212 1.77585 7.46819 2.13073C8.16322 2.38087 8.7771 2.8037 9.25575 3.35308L9.35199 3.46354H7.56916C7.22371 3.46354 6.94368 3.74358 6.94368 4.08903C6.94368 4.43447 7.22371 4.71451 7.56916 4.71451H10.7907C11.1361 4.71451 11.4161 4.43447 11.4161 4.08903V1.143C11.4161 0.797555 11.1361 0.517517 10.7907 0.517517C10.4452 0.517517 10.1652 0.797555 10.1652 1.143V2.48911Z' fill='%23141414'/></svg>");
    --en-task-icon-flag: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'><path fill-rule='evenodd' clip-rule='evenodd' d='M6.75 4.91666C6.19772 4.91666 5.75 5.36437 5.75 5.91666V6.37499V14.0833V18.875C5.75 19.2202 6.02982 19.5 6.375 19.5C6.72018 19.5 7 19.2202 7 18.875V14.0833H17.6148C18.32 14.0833 18.8036 13.3731 18.5453 12.7169L17.2942 9.53979C17.2707 9.48029 17.271 9.41407 17.2949 9.35475L18.5297 6.29042C18.7946 5.63322 18.3108 4.91666 17.6022 4.91666H6.75Z' fill='%23e54e40'/></svg>");
    --en-task-icon-reminder: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'><path d='M9.81583 18.6646C10.0605 19.6221 10.9456 20.3313 11.9999 20.3313C13.0542 20.3313 13.9393 19.6221 14.184 18.6646H9.81583Z' fill='%234d64ff'/><path d='M10.5714 5.50999C10.5714 4.72101 11.211 4.08142 12 4.08142C12.7889 4.08142 13.4285 4.72101 13.4285 5.50999C13.4285 5.57498 13.4242 5.63895 13.4158 5.70164C15.335 6.19344 16.7537 7.93466 16.7537 10.0072L16.7537 10.0172V12.2034C16.7552 12.4802 16.8279 12.7521 16.9649 12.9927L18.4756 15.6466C18.5067 15.6933 18.5342 15.7421 18.558 15.7925C18.5863 15.8524 18.6092 15.9146 18.6266 15.9784C18.653 16.0754 18.6666 16.1759 18.6666 16.2775C18.6666 16.9055 18.1575 17.4147 17.5294 17.4147H6.47045C5.98346 17.4147 5.56797 17.1085 5.4059 16.6782C5.35894 16.5536 5.33325 16.4185 5.33325 16.2774C5.33325 16.0529 5.39971 15.8334 5.52424 15.6466L7.03494 12.9927C7.17336 12.7495 7.24615 12.4745 7.24615 12.1947L7.24618 10.0072C7.24618 7.93463 8.66487 6.19339 10.5841 5.70162C10.5757 5.63894 10.5714 5.57497 10.5714 5.50999Z' fill='%234d64ff'/></svg>");

    display: grid;
    grid-template-columns: var(--en-task-icon-size) minmax(0, 1fr) auto;
    grid-template-areas:
      "checkbox title metadata"
      "checkbox date .";
    column-gap: 12px;
    row-gap: 0;
    width: 100%;
    box-sizing: border-box;
    margin: 10px 0;
    padding: 12px 14px;
    background: var(--en-task-bg);
    border: 1px solid var(--en-task-border);
    border-radius: 12px;
  }

  .en-task-checkbox {
    grid-area: checkbox;
    width: var(--en-task-icon-size);
    height: var(--en-task-icon-size);
    align-self: start;
    background-repeat: no-repeat;
    background-position: center;
    background-size: var(--en-task-icon-size) var(--en-task-icon-size);
  }

  .en-task[data-status="open"] .en-task-checkbox,
  .en-task:not([data-status]) .en-task-checkbox {
    background-image: var(--en-task-icon-open);
  }

  .en-task[data-status="complete"] .en-task-checkbox,
  .en-task[data-status="completed"] .en-task-checkbox {
    background-image: var(--en-task-icon-complete);
  }

  .en-task-title {
    grid-area: title;
    color: var(--en-task-title-colour);
    font-size: 15px;
    font-weight: 600;
    line-height: 1.4;
    word-break: break-word;
  }

  .en-task[data-status="complete"] .en-task-title,
  .en-task[data-status="completed"] .en-task-title {
    text-decoration: line-through;
    opacity: 0.72;
  }

  .en-task-date {
    grid-area: date;
    color: var(--en-task-muted-colour);
    font-size: 12px;
    line-height: 1.35;
    margin-top: 2px;
  }

  .en-task-date:empty {
    display: none;
  }

  .en-task-metadata {
    grid-area: metadata;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    min-height: var(--en-task-meta-icon-size);
    margin-top: 0;
    align-self: center;
    justify-self: end;
    white-space: nowrap;
  }

  .en-task-recurrence:empty,
  .en-task-flag:empty,
  .en-task-reminder:empty {
    display: none;
  }

  .en-task-recurrence:not(:empty),
  .en-task-flag:not(:empty),
  .en-task-reminder:not(:empty) {
    display: inline-block;
    width: var(--en-task-meta-icon-size);
    height: var(--en-task-meta-icon-size);
    flex: 0 0 var(--en-task-meta-icon-size);
    font-size: 0;
    line-height: 0;
    overflow: hidden;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
  }

  .en-task-flag:not(:empty),
  .en-task-reminder:not(:empty) {
    background-size: var(--en-task-meta-icon-scale) var(--en-task-meta-icon-scale);
  }

  .en-task-recurrence:not(:empty) {
    background-image: var(--en-task-icon-recurrence);
  }

  .en-task-flag:not(:empty) {
    background-image: var(--en-task-icon-flag);
  }

  .en-task-reminder:not(:empty) {
    background-image: var(--en-task-icon-reminder);
  }

  body.darkMode .en-task {
    --en-task-bg: rgba(255, 255, 255, 0.05);
    --en-task-border: rgba(255, 255, 255, 0.10);
    --en-task-title-colour: #f3f3f3;
    --en-task-muted-colour: #a6a6a6;
    --en-task-icon-open: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'><circle cx='11.9243' cy='12' r='8' fill='transparent'/><circle cx='11.9243' cy='12' r='8.5' fill='transparent'/><path fill-rule='evenodd' clip-rule='evenodd' d='M12 19.2917C16.027 19.2917 19.2916 16.0271 19.2916 12C19.2916 7.97291 16.027 4.70832 12 4.70832C7.97288 4.70832 4.70829 7.97291 4.70829 12C4.70829 16.0271 7.97288 19.2917 12 19.2917ZM12 20.3333C16.6023 20.3333 20.3333 16.6024 20.3333 12C20.3333 7.39762 16.6023 3.66666 12 3.66666C7.39759 3.66666 3.66663 7.39762 3.66663 12C3.66663 16.6024 7.39759 20.3333 12 20.3333Z' fill='%239d73ff'/></svg>");
    --en-task-icon-complete: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'><path d='M16.033 9.62529C16.2416 9.37251 16.2016 9.00193 15.9436 8.79756C15.6856 8.59318 15.3074 8.63242 15.0988 8.8852L10.9721 13.8865L8.84097 11.9627C8.59699 11.7424 8.21699 11.7577 7.9922 11.9967C7.76742 12.2358 7.78298 12.6081 8.02697 12.8284L10.6293 15.1776C10.7514 15.2879 10.9146 15.3436 11.0802 15.3318C11.2458 15.3199 11.399 15.2414 11.5034 15.1148L16.033 9.62529Z' fill='%239d73ff'/><path fill-rule='evenodd' clip-rule='evenodd' d='M20.3333 12C20.3333 16.6024 16.6023 20.3333 12 20.3333C7.39759 20.3333 3.66663 16.6024 3.66663 12C3.66663 7.39762 7.39759 3.66666 12 3.66666C16.6023 3.66666 20.3333 7.39762 20.3333 12ZM19.2916 12C19.2916 16.0271 16.027 19.2917 12 19.2917C7.97288 19.2917 4.70829 16.0271 4.70829 12C4.70829 7.97291 7.97288 4.70832 12 4.70832C16.027 4.70832 19.2916 7.97291 19.2916 12Z' fill='%239d73ff'/></svg>");
    --en-task-icon-recurrence: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none'><path fill-rule='evenodd' clip-rule='evenodd' d='M10.1652 2.48911L10.05 2.36714C9.45593 1.73783 8.71834 1.25114 7.8918 0.953674C6.61912 0.49564 5.22303 0.517718 3.96546 1.01576C2.70789 1.51381 1.67526 2.4536 1.06129 3.65882C0.447319 4.86405 0.2942 6.25188 0.630662 7.56197C0.967125 8.87205 1.77005 10.0144 2.88879 10.7746C4.00754 11.5348 5.36523 11.8607 6.70716 11.6911C8.04909 11.5215 9.28304 10.8682 10.1775 9.85356C10.7819 9.168 11.0165 8.65828 11.3508 7.68294C11.4186 7.48538 11.4208 7.29978 11.3516 7.14583C11.2819 6.99081 11.1443 6.87807 10.9532 6.81892C10.8063 6.77343 10.6518 6.78139 10.5105 6.86449C10.3707 6.9468 10.2516 7.09824 10.164 7.32511C9.92771 7.93661 9.68386 8.52184 9.23914 9.02629C8.54611 9.81241 7.59005 10.3186 6.55034 10.45C5.51062 10.5814 4.45868 10.3289 3.59189 9.73989C2.72509 9.15088 2.10299 8.26583 1.84231 7.25079C1.58162 6.23574 1.70025 5.16046 2.17595 4.22666C2.65165 3.29286 3.45173 2.56472 4.42609 2.17884C5.40044 1.79295 6.48212 1.77585 7.46819 2.13073C8.16322 2.38087 8.7771 2.8037 9.25575 3.35308L9.35199 3.46354H7.56916C7.22371 3.46354 6.94368 3.74358 6.94368 4.08903C6.94368 4.43447 7.22371 4.71451 7.56916 4.71451H10.7907C11.1361 4.71451 11.4161 4.43447 11.4161 4.08903V1.143C11.4161 0.797555 11.1361 0.517517 10.7907 0.517517C10.4452 0.517517 10.1652 0.797555 10.1652 1.143V2.48911Z' fill='%23ffffff'/></svg>");
    --en-task-icon-flag: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'><path fill-rule='evenodd' clip-rule='evenodd' d='M6.75 4.91666C6.19772 4.91666 5.75 5.36437 5.75 5.91666V6.37499V14.0833V18.875C5.75 19.2202 6.02982 19.5 6.375 19.5C6.72018 19.5 7 19.2202 7 18.875V14.0833H17.6148C18.32 14.0833 18.8036 13.3731 18.5453 12.7169L17.2942 9.53979C17.2707 9.48029 17.271 9.41407 17.2949 9.35475L18.5297 6.29042C18.7946 5.63322 18.3108 4.91666 17.6022 4.91666H6.75Z' fill='%23e54e40'/></svg>");
    --en-task-icon-reminder: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'><path d='M9.81583 18.6646C10.0605 19.6221 10.9456 20.3313 11.9999 20.3313C13.0542 20.3313 13.9393 19.6221 14.184 18.6646H9.81583Z' fill='%234d64ff'/><path d='M10.5714 5.50999C10.5714 4.72101 11.211 4.08142 12 4.08142C12.7889 4.08142 13.4285 4.72101 13.4285 5.50999C13.4285 5.57498 13.4242 5.63895 13.4158 5.70164C15.335 6.19344 16.7537 7.93466 16.7537 10.0072L16.7537 10.0172V12.2034C16.7552 12.4802 16.8279 12.7521 16.9649 12.9927L18.4756 15.6466C18.5067 15.6933 18.5342 15.7421 18.558 15.7925C18.5863 15.8524 18.6092 15.9146 18.6266 15.9784C18.653 16.0754 18.6666 16.1759 18.6666 16.2775C18.6666 16.9055 18.1575 17.4147 17.5294 17.4147H6.47045C5.98346 17.4147 5.56797 17.1085 5.4059 16.6782C5.35894 16.5536 5.33325 16.4185 5.33325 16.2774C5.33325 16.0529 5.39971 15.8334 5.52424 15.6466L7.03494 12.9927C7.17336 12.7495 7.24615 12.4745 7.24615 12.1947L7.24618 10.0072C7.24618 7.93463 8.66487 6.19339 10.5841 5.70162C10.5757 5.63894 10.5714 5.57497 10.5714 5.50999Z' fill='%234d64ff'/></svg>");
  }

  /* =============================================================================
     17. CALLOUTS
     ============================================================================= */

  .en-callout {
    display: flex;
    position: relative;
    margin: var(--spacing-1-5) 0;
    min-width: 100px;
    padding: var(--spacing-3) var(--spacing-1-5) var(--spacing-3) var(--spacing-1-5);
    border-radius: var(--radius-xs);
    background-color: var(--en-callout-bg, var(--color-surface-fill-secondary-enabled));
  }

  .en-callout-plain  { --en-callout-bg: var(--color-surface-fill-secondary-enabled); }
  .en-callout-yellow { --en-callout-bg: rgba(255, 219, 39, .45); }
  .en-callout-pink   { --en-callout-bg: rgba(253, 117, 151, .45); }
  .en-callout-green  { --en-callout-bg: rgba(95, 237, 153, .45); }
  .en-callout-blue   { --en-callout-bg: rgba(73, 213, 231, .45); }
  .en-callout-purple { --en-callout-bg: rgba(139, 137, 255, .45); }
  .en-callout-orange { --en-callout-bg: rgba(255, 153, 79, .45); }

  body.darkMode .en-callout-plain  { --en-callout-bg: var(--color-surface-fill-secondary-enabled); }
  body.darkMode .en-callout-yellow { --en-callout-bg: hsla(50, 74%, 72%, .45); }
  body.darkMode .en-callout-pink   { --en-callout-bg: rgba(234, 167, 182, .45); }
  body.darkMode .en-callout-green  { --en-callout-bg: rgba(156, 227, 185, .45); }
  body.darkMode .en-callout-blue   { --en-callout-bg: rgba(145, 214, 222, .45); }
  body.darkMode .en-callout-purple { --en-callout-bg: rgba(178, 176, 236, .45); }
  body.darkMode .en-callout-orange { --en-callout-bg: hsla(25, 70%, 75%, .45); }

  .en-callout-emoji {
    flex: 0 0 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    margin-right: var(--spacing-1);
    font-size: 20px;
    line-height: 20px;
    padding: var(--spacing-2-5) var(--spacing-1) var(--spacing-2-5) var(--spacing-3);
  }

  .en-callout-content {
    flex: 1 1 0%;
    min-width: 0;
    padding: var(--spacing-1-5) var(--spacing-2) var(--spacing-1-5) var(--spacing-2);
  }

  /* =============================================================================
     18. WEB CLIPS
     ============================================================================= */

  .en-web-clip {
    margin: 1em 0;
    max-width: 80%;
  }

  .en-web-clip-shell {
    position: relative;
    border: 1px solid var(--color-surface-fill-secondary-enabled);
    border-radius: 8px;
    background-color: var(--color-surface-fill-secondary-enabled);
    padding: 0;
    margin: 0;
    overflow: hidden;
  }

  .en-web-clip .html-embed-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 2px solid var(--background-modifier-border);
    min-height: 40px;
    background-color: var(--background-primary-alt);
  }

  .en-web-clip .html-embed-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }

  .en-web-clip .html-embed-header-right {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .en-web-clip .html-embed-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: var(--radius-s);
    cursor: pointer;
    transition: background-color 0.15s ease, opacity 0.15s ease;
    opacity: 0.7;
    color: var(--text-muted);
    background: transparent;
    text-decoration: none;
  }

  .en-web-clip .html-embed-button:hover {
    background-color: var(--background-modifier-hover);
    opacity: 1;
    color: var(--text-normal);
    text-decoration: none;
  }

  .en-web-clip .html-embed-button:active {
    background-color: var(--background-modifier-active-hover);
  }

  .en-web-clip .html-embed-button svg {
    width: 14px;
    height: 14px;
  }

  .en-web-clip .html-embed-button-text {
    width: auto;
    min-width: 28px;
    height: 28px;
    padding: 0 10px;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    font-family: var(--font-interface);
    white-space: nowrap;
  }

  .en-web-clip .html-embed-button-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .en-web-clip .html-embed-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--text-accent);
    opacity: 0.9;
  }

  .en-web-clip .html-embed-icon svg {
    width: 16px;
    height: 16px;
  }

  .en-web-clip .html-embed-filename {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-normal);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: var(--font-interface);
  }

  .en-web-clip .html-embed-button-label {
    line-height: 1;
  }

  .en-web-clip-button {
    color: var(--text-normal);
    text-decoration: none;
  }

  .en-web-clip-button:hover {
    text-decoration: none;
  }

  .en-web-clip-body {
    padding: 0;
    margin: 0;
  }

  .en-web-clip-frame {
    max-height: 842px;
    overflow: auto;
    background-color: white;
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-m);
  }

  .theme-dark .en-web-clip-frame {
    background-color: var(--background-primary);
  }

  .en-web-clip-content {
    min-width: 100%;
    white-space: normal;
    word-break: normal;
  }

  @media (max-width: 768px) {
    .en-web-clip-frame {
      max-height: 600px;
    }
  }
`;
