import fs from "node:fs/promises";
import path from "node:path";

const rootCachePath = path.resolve("data/narrative-cache.json");
const dashboardCachePath = path.resolve("outputs/kgld-dashboard/data/narrative-cache.json");
const rootHistoryPath = path.resolve("data/narrative-history.json");
const dashboardHistoryPath = path.resolve("outputs/kgld-dashboard/data/narrative-history.json");

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function main() {
  await fs.mkdir(path.dirname(dashboardCachePath), { recursive: true });
  await fs.copyFile(rootCachePath, dashboardCachePath);
  try {
    await fs.copyFile(rootHistoryPath, dashboardHistoryPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await fs.writeFile(dashboardHistoryPath, `${JSON.stringify({ updatedAt: "unknown", snapshots: [] }, null, 2)}\n`, "utf8");
  }

  const rootCache = await readJson(rootCachePath);
  const dashboardCache = await readJson(dashboardCachePath);
  const dashboardHistory = await readJson(dashboardHistoryPath);
  const filesMatch = JSON.stringify(rootCache) === JSON.stringify(dashboardCache);

  if (!filesMatch) {
    throw new Error("Narrative cache copy verification failed.");
  }

  console.log("[narrative-cache] deploy copy verified");
  console.log(`[narrative-cache] source=${dashboardCache.source || "unknown"}`);
  console.log(`[narrative-cache] generatedAt=${dashboardCache.generatedAt || "unknown"}`);
  console.log(`[narrative-cache] usedFallback=${dashboardCache.diagnostics?.usedFallback ?? "unknown"}`);
  console.log(`[narrative-cache] trendMood=${dashboardCache.narrativeTrend?.trendMood || "unknown"}`);
  console.log(`[narrative-history] snapshots=${dashboardHistory.snapshots?.length || 0}`);
}

main().catch((error) => {
  console.error(`[narrative-cache] ${error.message}`);
  process.exitCode = 1;
});
