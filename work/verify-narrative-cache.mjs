import fs from "node:fs/promises";
import path from "node:path";

const rootCachePath = path.resolve("data/narrative-cache.json");
const dashboardCachePath = path.resolve("outputs/kgld-dashboard/data/narrative-cache.json");

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function main() {
  await fs.mkdir(path.dirname(dashboardCachePath), { recursive: true });
  await fs.copyFile(rootCachePath, dashboardCachePath);

  const rootCache = await readJson(rootCachePath);
  const dashboardCache = await readJson(dashboardCachePath);
  const filesMatch = JSON.stringify(rootCache) === JSON.stringify(dashboardCache);

  if (!filesMatch) {
    throw new Error("Narrative cache copy verification failed.");
  }

  console.log("[narrative-cache] deploy copy verified");
  console.log(`[narrative-cache] source=${dashboardCache.source || "unknown"}`);
  console.log(`[narrative-cache] generatedAt=${dashboardCache.generatedAt || "unknown"}`);
  console.log(`[narrative-cache] usedFallback=${dashboardCache.diagnostics?.usedFallback ?? "unknown"}`);
}

main().catch((error) => {
  console.error(`[narrative-cache] ${error.message}`);
  process.exitCode = 1;
});
