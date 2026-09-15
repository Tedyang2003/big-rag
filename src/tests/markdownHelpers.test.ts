import { test } from "node:test";
import * as assert from "node:assert/strict";
import { inferStructure } from "../parsers/markdown/inferStructure";
import { htmlToMarkdown } from "../parsers/markdown/htmlToMarkdown";
import { markdownToPlain, normalizeMarkdown } from "../parsers/markdown/normalizeMarkdown";

test("inferStructure marks headings, list items, and joined paragraphs", () => {
  const raw = [
    "Incident Roundup",
    "",
    "Published on 20 September 2026.",
    "",
    "1. 3 Sep 2026: Warehouse fire in",
    "Tuas. Two injured.",
    "• Bus collision reported",
    "",
    "It contains a paragraph that wraps",
    "across two lines.",
  ].join("\n");

  assert.equal(
    inferStructure(raw),
    [
      "## Incident Roundup",
      "Published on 20 September 2026.",
      "1. 3 Sep 2026: Warehouse fire in Tuas. Two injured.",
      "- Bus collision reported",
      "It contains a paragraph that wraps across two lines.",
    ].join("\n\n"),
  );
});

test("inferStructure treats the first line as a heading even without a blank line after it", () => {
  assert.equal(inferStructure("Summary\nThis line follows directly."), "## Summary\n\nThis line follows directly.");
});

test("inferStructure does not treat long lines or lines ending in punctuation as headings", () => {
  const long = "This line has far too many words to ever count as a heading line here";
  assert.equal(inferStructure(`Intro sentence.\n\n${long}\n\nNotes:\n\nEnd.`), `Intro sentence.\n\n${long}\n\nNotes:\n\nEnd.`);
});

test("inferStructure keeps existing Markdown headings", () => {
  assert.equal(inferStructure("## Page 2\n\nBody text."), "## Page 2\n\nBody text.");
});

test("inferStructure returns an empty string for blank input", () => {
  assert.equal(inferStructure("  \n\n \t"), "");
});

test("htmlToMarkdown converts headings, paragraphs, lists, and tables", () => {
  const html = `
    <html><head><style>body{}</style><script>alert(1)</script></head><body>
      <h2>Report <b>Title</b></h2>
      <p>This is a <strong>sample</strong> paragraph.</p>
      <ul><li>First<ul><li>Nested</li></ul></li><li>Second</li></ul>
      <ol><li>Step one</li><li>Step two</li></ol>
      <table><tr><th>Area</th><th>Damage</th></tr><tr><td>Tuas</td><td>High</td></tr></table>
      <div>Inline <em>only</em> div</div>
      <h5>Deep heading</h5>
    </body></html>`;

  assert.equal(
    htmlToMarkdown(html),
    [
      "## Report Title",
      "This is a sample paragraph.",
      "- First\n  - Nested\n- Second",
      "1. Step one\n2. Step two",
      "Area | Damage\nTuas | High",
      "Inline only div",
      "### Deep heading",
    ].join("\n\n"),
  );
});

test("normalizeMarkdown keeps structure and removes formatting noise", () => {
  const md = [
    "# Sample Title",
    "",
    "> Quoted line.",
    "",
    "* Item **one**",
    "+ Item _two_",
    "",
    "See [the link](https://example.com) and `code`.",
    "",
    "```",
    "const block = 1;",
    "```",
    "",
    "| Area | Damage |",
    "| --- | --- |",
    "| Tuas | High |",
  ].join("\n");

  assert.equal(
    normalizeMarkdown(md),
    [
      "# Sample Title",
      "",
      "Quoted line.",
      "",
      "- Item one",
      "- Item two",
      "",
      "See the link and code.",
      "",
      "Area | Damage",
      "Tuas | High",
    ].join("\n"),
  );
});

test("markdownToPlain strips heading and bullet markers but keeps numbers", () => {
  assert.equal(markdownToPlain("## Slide 1: Title\n- point\n  - nested\n1. step"), "Slide 1: Title\npoint\nnested\n1. step");
});

test("htmlToMarkdown separates words across line breaks and nested blocks", () => {
  assert.equal(htmlToMarkdown("<p>Report<br>15 September 2026</p>"), "Report 15 September 2026");
  assert.equal(htmlToMarkdown("<form><h1>Title</h1><p>Body para</p></form>"), "# Title\n\nBody para");
  assert.equal(
    htmlToMarkdown("<table><tr><td><p>a</p><p>b</p></td><td>c</td></tr></table>"),
    "a b | c",
  );
  assert.equal(htmlToMarkdown("<ul><li><p>one</p><p>two</p></li></ul>"), "- one two");
});
