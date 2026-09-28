"use strict";

// Post-build step: render build/index.html in headless Chrome and bake the
// resulting markup into #root, so crawlers and link previews see real content
// instead of an empty <div>. Uses the locally installed Google Chrome.
//
// A failure here only prints a warning: the unrendered build still works.

const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright-core");

const BUILD_DIR = path.resolve(__dirname, "../build");
const INDEX_PATH = path.join(BUILD_DIR, "index.html");
const EMPTY_ROOT = '<div id="root"></div>';

const CONTENT_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};

function serveBuild() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    let filePath = path.join(BUILD_DIR, urlPath);
    if (!filePath.startsWith(BUILD_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = INDEX_PATH;
    }
    res.writeHead(200, {
      "Content-Type": CONTENT_TYPES[path.extname(filePath)] || "application/octet-stream",
    });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function prerender() {
  const template = fs.readFileSync(INDEX_PATH, "utf8");
  if (!template.includes(EMPTY_ROOT)) {
    throw new Error(`${EMPTY_ROOT} not found in build/index.html (already prerendered?)`);
  }

  const server = await serveBuild();
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const page = await browser.newPage({ viewport: { width: 1512, height: 982 } });
    await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    // Let the hero's entrance animation settle so the snapshot is at rest
    await page.waitForTimeout(1500);

    const markup = await page.evaluate(() => document.getElementById("root").innerHTML);
    if (!markup.trim()) throw new Error("#root rendered empty");

    fs.writeFileSync(INDEX_PATH, template.replace(EMPTY_ROOT, `<div id="root">${markup}</div>`));
    console.log(`Prerendered build/index.html (${Math.round(markup.length / 1024)} KB of markup).`);
  } finally {
    await browser.close();
    server.close();
  }
}

prerender().catch((err) => {
  console.warn("\n\x1b[33mWARNING: prerender skipped; the site will still work, but crawlers see an empty page.\x1b[0m");
  console.warn(err.message);
});
