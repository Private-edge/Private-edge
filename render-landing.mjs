// Renders the inline landing page from src/index.js to landing.html (preview).
// v8 keeps the landing inside index.js (landingHtml), so we extract and run it.
import { readFile, writeFile } from "node:fs/promises";

const source = await readFile(new URL("../src/index.js", import.meta.url), "utf8");

// Pull the small pieces the landing renderer needs: HTML_ESCAPES, landingHtml,
// escapeHtml and safeColor.
const escapesStart = source.indexOf("const HTML_ESCAPES = {");
const escapesEnd = source.indexOf("};", escapesStart) + 2;
const escapes = source.slice(escapesStart, escapesEnd);

const start = source.indexOf("function landingHtml(env) {");
const end = source.indexOf("function escapeHtml(value) {");
const escapeFn = source.slice(end, source.indexOf("function safeColor(value) {"));
const safeColorEnd = source.indexOf("function ", source.indexOf("function safeColor(value) {") + 1);
const safeColorFn = source.slice(source.indexOf("function safeColor(value) {"), safeColorEnd > 0 ? safeColorEnd : source.length);

// eslint-disable-next-line no-eval
eval(escapes + "\n" + source.slice(start, end) + "\n" + escapeFn + "\n" + safeColorFn + "\n;globalThis.__landing = landingHtml;");

await writeFile(
  new URL("../landing.html", import.meta.url),
  globalThis.__landing(process.env),
  "utf8",
);
console.log("landing.html generated from src/index.js");
