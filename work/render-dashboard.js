const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

async function main() {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath) {
    throw new Error("Usage: render-dashboard.js <input.html> <output.png>");
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1400, height: 1800 },
      deviceScaleFactor: 1
    });
    await page.goto(pathToFileURL(path.resolve(inputPath)).href, {
      waitUntil: "networkidle"
    });
    await page.screenshot({
      path: path.resolve(outputPath),
      fullPage: true,
      type: "png"
    });
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
