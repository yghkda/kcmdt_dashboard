import fs from "node:fs/promises";
import path from "node:path";

const INDEX_PATH = path.resolve("outputs/kgld-dashboard/index.html");

function stampValue() {
  if (process.env.GITHUB_RUN_ID) return `run-${process.env.GITHUB_RUN_ID}`;
  return `local-${Date.now()}`;
}

function replaceAssetStamp(html, asset, stamp) {
  const escaped = asset.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.replace(new RegExp(`${escaped}(?:\\?v=[^"']*)?`, "g"), `${asset}?v=${stamp}`);
}

async function main() {
  const stamp = stampValue();
  let html = await fs.readFile(INDEX_PATH, "utf8");
  html = replaceAssetStamp(html, "styles.css", stamp);
  html = replaceAssetStamp(html, "dashboard-data.js", stamp);
  html = replaceAssetStamp(html, "app.js", stamp);
  await fs.writeFile(INDEX_PATH, html, "utf8");
  console.log(`Stamped dashboard assets with ${stamp}.`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
