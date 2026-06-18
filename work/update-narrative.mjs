import fs from "node:fs/promises";
import path from "node:path";

const ROOT_CACHE_PATH = path.resolve("data/narrative-cache.json");
const DASHBOARD_CACHE_PATH = path.resolve("outputs/kgld-dashboard/data/narrative-cache.json");
const TOKEN_ADDRESS = "0xD1479fD673D9767E6c6E46eF6Bc640ff1F6Eb9CE";
const ISSUE_ADDRESS = "0xd5A62Dd28BF16229b4Dd9687DECC233548B9AA95".toLowerCase();
const REDEEM_ADDRESS = "0xe257fe24611CfabCa4a48869C1222D1cC2602E70".toLowerCase();
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const SCALE = 10n ** 18n;

function getRpcUrl() {
  if (process.env.ALCHEMY_ETH_MAINNET_URL) return process.env.ALCHEMY_ETH_MAINNET_URL;
  if (process.env.ALCHEMY_API_KEY) return `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  throw new Error("Set ALCHEMY_ETH_MAINNET_URL or ALCHEMY_API_KEY.");
}

async function rpc(method, params) {
  const response = await fetch(getRpcUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
  });
  if (!response.ok) throw new Error(`RPC ${method} failed with HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(`RPC ${method} error: ${payload.error.message}`);
  return payload.result;
}

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

function formatToken(value) {
  const whole = value / SCALE;
  const fraction = (value % SCALE).toString().padStart(18, "0").slice(0, 4).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function parseTransferAmount(transfer) {
  if (transfer.rawContract?.value) return BigInt(transfer.rawContract.value);
  if (transfer.value === undefined || transfer.value === null) return 0n;
  const [wholePart, fractionPart = ""] = String(transfer.value).split(".");
  return BigInt(wholePart || "0") * SCALE + BigInt((fractionPart + "0".repeat(18)).slice(0, 18) || "0");
}

function fallbackNarrative(reason = "데이터를 불러오지 못했습니다.") {
  return {
    generatedAt: asKstString(new Date()),
    source: "fallback",
    marketWeather: {
      title: "Market Weather for KGLD",
      stablecoinWeather: "unknown",
      goldTokenWeather: "unknown",
      rwaWeather: "unknown",
      gasWeather: "unknown",
      todayPositioning: reason,
      contentAngle: "Real asset trust onchain",
      confidence: "low"
    },
    contentIdea: {
      title: "KGLD Content Idea",
      contentAngle: "Real asset trust onchain",
      oneLineInsight: "RWA 프로젝트의 신뢰는 과장된 활동보다 검증 가능한 구조에서 시작됩니다.",
      tweetDraftEnglish: "Real-world assets do not need hype to matter. They need structure, transparency, and trust.",
      tweetDraftKorean: "RWA의 신뢰는 과장된 활동보다 검증 가능한 구조에서 시작됩니다.",
      whyNow: "실시간 내러티브 데이터를 충분히 확인하지 못해 보수적인 fallback 메시지를 표시합니다.",
      doNotSay: [
        "KGLD is widely traded",
        "KGLD is listed on a specific exchange unless confirmed",
        "Guaranteed gold redemption without policy conditions",
        "Investment return or price appreciation"
      ]
    }
  };
}

function classifyGas(gasPriceWei) {
  const gwei = Number(gasPriceWei) / 1e9;
  if (!Number.isFinite(gwei)) return "unknown";
  if (gwei < 15) return "low";
  if (gwei <= 40) return "normal";
  return "high";
}

function classifyKgldActivity(transfers) {
  let operational = false;
  let watch = false;
  let volume = 0n;

  for (const transfer of transfers) {
    const from = String(transfer.from || ZERO_ADDRESS).toLowerCase();
    const to = String(transfer.to || ZERO_ADDRESS).toLowerCase();
    const amount = parseTransferAmount(transfer);
    volume += amount;

    if (from === ZERO_ADDRESS || to === ZERO_ADDRESS || from === ISSUE_ADDRESS || to === ISSUE_ADDRESS || from === REDEEM_ADDRESS || to === REDEEM_ADDRESS) {
      operational = true;
    }
    if (amount >= 100n * SCALE && !operational) {
      watch = true;
    }
  }

  if (transfers.length === 0) return { state: "quiet", volume };
  if (watch) return { state: "watch", volume };
  if (operational) return { state: "operational", volume };
  return { state: "active", volume };
}

function buildNarrative({ gasWeather, transfers }) {
  const activity = classifyKgldActivity(transfers);
  const hasUnknowns = gasWeather === "unknown";
  const generatedAt = asKstString(new Date());

  let todayPositioning = "오늘은 데이터가 제한적이므로 KGLD의 핵심 메시지를 준비자산·상환·운영 투명성 중심으로 유지하는 것이 적절합니다.";
  let contentAngle = "Real asset trust onchain";
  let oneLineInsight = "RWA 프로젝트의 신뢰는 과장된 활동보다 검증 가능한 구조에서 시작됩니다.";
  let whyNow = "stablecoin, PAXG, XAUT, 외부 RWA 데이터는 아직 연결하지 않았고 KGLD 활동과 gas만 반영했습니다.";
  let confidence = "low";

  if (activity.state === "quiet" && (gasWeather === "low" || gasWeather === "normal")) {
    todayPositioning = "오늘은 KGLD가 거래량보다 실물 기반 신뢰와 상환 가능성을 강조하기 좋은 구간입니다.";
    contentAngle = "Gold as a quiet onchain asset";
    oneLineInsight = "모든 온체인 자산이 빠르게 움직일 필요는 없습니다. 실물 기반 자산은 설명 가능성과 신뢰가 중요합니다.";
    whyNow = `최근 KGLD Transfer가 조용하고 gas 상태가 ${gasWeather}로 관찰되어, 거래 활성도보다 신뢰 메시지가 더 적합합니다.`;
    confidence = "medium";
  } else if (activity.state === "operational") {
    todayPositioning = "오늘은 KGLD의 운영 흐름을 설명 가능한 온체인 데이터로 보여주기 좋은 구간입니다.";
    contentAngle = "RWA transparency over hype";
    oneLineInsight = "온체인에서 설명 가능한 운영 흐름은 RWA 신뢰의 출발점입니다.";
    whyNow = `최신 KGLD 이벤트 ${transfers.length}건 중 Issue/Redeem/발행/소각 관련 이동이 관찰되었습니다.`;
    confidence = "medium";
  } else if (activity.state === "watch") {
    todayPositioning = "오늘은 KGLD 이동을 과장하지 않고, 대형 이동의 맥락과 운영 설명 가능성을 함께 점검하기 좋은 구간입니다.";
    contentAngle = "RWA transparency over hype";
    oneLineInsight = "대형 이동보다 중요한 것은 그 이동을 설명할 수 있는 구조입니다.";
    whyNow = `최신 KGLD 이벤트에서 100 KGLD 이상 이동이 관찰되었습니다. 의도는 단정하지 않습니다.`;
    confidence = "medium";
  }

  if (hasUnknowns) confidence = "low";

  return {
    generatedAt,
    source: "alchemy",
    marketWeather: {
      title: "Market Weather for KGLD",
      stablecoinWeather: "unknown",
      goldTokenWeather: activity.state === "quiet" ? "quiet" : activity.state === "operational" ? "cloudy" : "unknown",
      rwaWeather: "unknown",
      gasWeather,
      todayPositioning,
      contentAngle,
      confidence
    },
    contentIdea: {
      title: "KGLD Content Idea",
      contentAngle,
      oneLineInsight,
      tweetDraftEnglish: contentAngle === "Gold as a quiet onchain asset"
        ? "Not every onchain asset needs to move fast. Some are built to make real-world trust easier to verify."
        : "For RWAs, the strongest signal is not noise. It is a structure people can verify.",
      tweetDraftKorean: contentAngle === "Gold as a quiet onchain asset"
        ? "모든 온체인 자산이 빠르게 움직일 필요는 없습니다. 실물 기반 자산은 설명 가능성과 신뢰가 중요합니다."
        : "RWA에서 중요한 신호는 과장된 활동이 아니라 검증 가능한 구조입니다.",
      whyNow,
      doNotSay: [
        "KGLD is widely traded",
        "KGLD is listed on a specific exchange unless confirmed",
        "Guaranteed gold redemption without policy conditions",
        "Investment return or price appreciation"
      ]
    },
    observed: {
      kgldTransferSampleSize: transfers.length,
      kgldActivity: activity.state,
      kgldObservedVolume: `${formatToken(activity.volume)} KGLD`
    }
  };
}

async function fetchMinimalNarrativeInputs() {
  const [gasHex, latestBlockHex] = await Promise.all([
    rpc("eth_gasPrice", []),
    rpc("eth_blockNumber", [])
  ]);
  const latestBlock = BigInt(latestBlockHex);
  const fromBlock = latestBlock > 7200n ? latestBlock - 7200n : 0n;
  const transferResult = await rpc("alchemy_getAssetTransfers", [{
    fromBlock: `0x${fromBlock.toString(16)}`,
    toBlock: "latest",
    category: ["erc20"],
    contractAddresses: [TOKEN_ADDRESS],
    withMetadata: true,
    excludeZeroValue: false,
    maxCount: "0x14",
    order: "desc"
  }]);

  return {
    gasWeather: classifyGas(BigInt(gasHex)),
    transfers: transferResult.transfers || []
  };
}

async function writeNarrativeCache(data) {
  const serialized = `${JSON.stringify(data, null, 2)}\n`;
  await fs.mkdir(path.dirname(ROOT_CACHE_PATH), { recursive: true });
  await fs.mkdir(path.dirname(DASHBOARD_CACHE_PATH), { recursive: true });
  await Promise.all([
    fs.writeFile(ROOT_CACHE_PATH, serialized, "utf8"),
    fs.writeFile(DASHBOARD_CACHE_PATH, serialized, "utf8")
  ]);
}

async function main() {
  let narrative;
  try {
    const inputs = await fetchMinimalNarrativeInputs();
    narrative = buildNarrative(inputs);
  } catch (error) {
    console.warn(`Narrative update fallback: ${error.message}`);
    narrative = fallbackNarrative("데이터를 불러오지 못했습니다.");
  }
  await writeNarrativeCache(narrative);
  console.log(`Updated narrative cache: ${narrative.source} at ${narrative.generatedAt}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
