import fs from "node:fs/promises";
import path from "node:path";

const ROOT_NEWS_PATH = path.resolve("data/news-context.json");
const DASHBOARD_NEWS_PATH = path.resolve("outputs/kgld-dashboard/data/news-context.json");
const NAVER_MCP_RESULTS_PATH = path.resolve("data/naver-news-mcp-results.json");

const KEYWORD_TAGS = [
  { pattern: /ITCEN|아이티센/i, tag: "ITCEN" },
  { pattern: /ITCEN Global|아이티센글로벌/i, tag: "ITCEN Global" },
  { pattern: /KGLD|케이골드/i, tag: "KGLD" },
  { pattern: /KorDA|한국금거래소디지털에셋/i, tag: "KorDA" },
  { pattern: /LayerZero|레이어제로/i, tag: "LayerZero" },
  { pattern: /RWA|실물연계자산|실물 자산/i, tag: "RWA" },
  { pattern: /금|gold/i, tag: "Gold" }
];

function asKstString(date) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} KST`;
}

function stripHtml(value = "") {
  return String(value)
    .replace(/<\/?b>/gi, "")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function safeUrl(item) {
  return item.originallink || item.link || "";
}

function publisherFromUrl(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (hostname.includes("mk.co.kr")) return "매일경제";
    if (hostname.includes("biz.chosun.com")) return "조선비즈";
    if (hostname.includes("thebell.co.kr")) return "더벨";
    if (hostname.includes("edaily.co.kr")) return "이데일리";
    if (hostname.includes("tokenpost.kr")) return "TokenPost";
    if (hostname.includes("zdnet.co.kr")) return "ZDNet Korea";
    return hostname;
  } catch {
    return "Naver News";
  }
}

function inferTags(item, query = "") {
  const sourceText = `${query} ${item.title || ""} ${item.description || ""}`;
  const tags = KEYWORD_TAGS
    .filter(({ pattern }) => pattern.test(sourceText))
    .map(({ tag }) => tag);
  return [...new Set(tags.length ? tags : ["KGLD"])];
}

function relevanceFor(tags, item) {
  const text = `${item.title || ""} ${item.description || ""}`;
  if (tags.includes("KGLD") && /아이티센글로벌|ITCEN Global|LayerZero|레이어제로|KorDA|한국금거래소디지털에셋/i.test(text)) {
    return "high";
  }
  if (tags.includes("KGLD") || tags.includes("RWA")) return "medium";
  return "low";
}

function cautionFor(tags) {
  const cautions = [
    "보도된 계획과 추진 내용을 완료된 발행, 상장, 거래 활성화로 확대 해석하지 마세요."
  ];
  if (tags.includes("LayerZero")) {
    cautions.push("멀티체인 확장은 공개 기사 범위 안에서만 표현하고, 모든 체인 활성화를 단정하지 마세요.");
  }
  if (tags.includes("RWA") || tags.includes("Gold")) {
    cautions.push("실물 기반 신뢰는 설명 가능하지만 수익률, 가격 상승, 무조건 상환 보장은 말하지 마세요.");
  }
  return cautions.join(" ");
}

function normalizeMcpItems(rawResults) {
  const byUrl = new Map();
  for (const result of rawResults?.queries || []) {
    for (const item of result.items || []) {
      const url = safeUrl(item);
      if (!url || byUrl.has(url)) continue;
      const tags = inferTags(item, result.query);
      byUrl.set(url, {
        title: stripHtml(item.title),
        publisher: publisherFromUrl(url),
        publishedAt: item.pubDate || "",
        url,
        naverUrl: item.link || "",
        summary: stripHtml(item.description),
        tags,
        relevance: relevanceFor(tags, item),
        usableForContent: true,
        caution: cautionFor(tags),
        verified: true,
        sourceType: "media",
        sourceProvider: "naver_news_mcp",
        query: result.query || ""
      });
    }
  }
  return [...byUrl.values()]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 10);
}

async function readNaverMcpResults() {
  try {
    return JSON.parse(await fs.readFile(NAVER_MCP_RESULTS_PATH, "utf8"));
  } catch {
    return null;
  }
}

function buildNewsNarrative(items) {
  if (!items.length) {
    return {
      headline: "KGLD 관련 신규 기사 데이터가 아직 연결되지 않았습니다.",
      keyMessage: "Content Opportunities는 온체인 데이터와 보수적 evergreen 메시지를 중심으로 생성됩니다.",
      kgldAngle: "뉴스가 없을 때는 실물 기반 신뢰, 상환 가능성, 운영 투명성을 중심으로 설명하세요.",
      doNotOverclaim: defaultDoNotOverclaim()
    };
  }

  const hasRecentItcen = items.some((item) => item.tags.includes("ITCEN") || item.tags.includes("ITCEN Global"));
  const hasLayerZero = items.some((item) => item.tags.includes("LayerZero"));
  const hasKorda = items.some((item) => item.tags.includes("KorDA"));
  const headlineParts = [];

  if (hasRecentItcen) headlineParts.push("아이티센글로벌/KGLD 관련 공개 보도");
  if (hasLayerZero) headlineParts.push("LayerZero 멀티체인 확장 보도");
  if (hasKorda) headlineParts.push("KorDA 운영 구조 보도");

  return {
    headline: `${headlineParts.slice(0, 2).join("와 ") || "KGLD 관련 공개 보도"}를 콘텐츠 근거로 사용할 수 있습니다.`,
    keyMessage: "네이버 뉴스 MCP로 확인된 기사만 콘텐츠 근거로 사용하며, 표현은 '보도에 따르면', '추진', '계획', '검증 가능성' 중심으로 제한합니다.",
    kgldAngle: "KGLD는 거래량보다 실물 금 기반 RWA 구조, 준비자산 설명 가능성, 멀티체인 확장 방향성을 차분히 설명하는 콘텐츠가 적합합니다.",
    doNotOverclaim: defaultDoNotOverclaim()
  };
}

function defaultDoNotOverclaim() {
  return [
    "상장 완료 또는 특정 거래소 거래 가능 표현",
    "발행 완료, 상용화 완료, 거래 활성화 완료 단정",
    "수익률, 이자, 가격 상승 암시",
    "모든 체인에서 활성화됐다는 표현",
    "무조건 상환 보장 표현"
  ];
}

function buildFallbackNewsContext() {
  return {
    generatedAt: asKstString(new Date()),
    source: "fallback",
    items: [
      {
        title: "KGLD news collection pending",
        publisher: "Fallback",
        publishedAt: "unknown",
        url: "https://search.naver.com/search.naver?where=news&query=KGLD",
        summary: "Naver News MCP 결과 파일이 없을 때 사용하는 보수적 fallback입니다.",
        tags: ["KGLD", "RWA", "Gold"],
        relevance: "low",
        usableForContent: false,
        caution: "실제 기사로 인용하지 마세요.",
        verified: false,
        sourceType: "fallback"
      }
    ],
    newsNarrative: buildNewsNarrative([])
  };
}

async function buildNewsContext() {
  const mcpResults = await readNaverMcpResults();
  const items = normalizeMcpItems(mcpResults);
  if (!items.length) return buildFallbackNewsContext();

  return {
    generatedAt: asKstString(new Date()),
    source: "naver_news_mcp",
    queries: (mcpResults.queries || []).map((query) => ({
      query: query.query,
      total: query.total,
      display: query.display
    })),
    items,
    newsNarrative: buildNewsNarrative(items),
    diagnostics: {
      generatedBy: "update-news-context.mjs",
      mcpResultsPath: "data/naver-news-mcp-results.json",
      usedMcpResults: true,
      itemCount: items.length
    }
  };
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function main() {
  const context = await buildNewsContext();
  await Promise.all([
    writeJson(ROOT_NEWS_PATH, context),
    writeJson(DASHBOARD_NEWS_PATH, context)
  ]);
  console.log(`[news-context] source=${context.source}`);
  console.log(`[news-context] generatedAt=${context.generatedAt}`);
  console.log(`[news-context] items=${context.items.length}`);
}

main().catch((error) => {
  console.error(`[news-context] ${error.stack || error.message}`);
  process.exitCode = 1;
});
