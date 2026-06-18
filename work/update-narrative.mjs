import fs from "node:fs/promises";
import path from "node:path";

const ROOT_CACHE_PATH = path.resolve("data/narrative-cache.json");
const DASHBOARD_CACHE_PATH = path.resolve("outputs/kgld-dashboard/data/narrative-cache.json");
const TOKEN_ADDRESS = "0xD1479fD673D9767E6c6E46eF6Bc640ff1F6Eb9CE";
const TOKENIZED_GOLD_TOKENS = {
  KGLD: TOKEN_ADDRESS,
  PAXG: "0x45804880De22913dAFE09f4980848ECE6EcbAf78",
  XAUT: "0x68749665FF8D2d112Fa859AA293F07A622782F38"
};
const ISSUE_ADDRESS = "0xd5A62Dd28BF16229b4Dd9687DECC233548B9AA95".toLowerCase();
const REDEEM_ADDRESS = "0xe257fe24611CfabCa4a48869C1222D1cC2602E70".toLowerCase();
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const SCALE = 10n ** 18n;
const TOKEN_TRANSFER_LIMIT_HEX = "0xa";
const LARGE_TRANSFER_THRESHOLD = 100;

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

function transferValueNumber(transfer) {
  if (transfer.value !== undefined && transfer.value !== null) {
    const value = Number(transfer.value);
    return Number.isFinite(value) ? value : 0;
  }
  return Number(formatToken(parseTransferAmount(transfer)));
}

function unknownTokenState() {
  return {
    activity: "unknown",
    transferCount: 0,
    largeTransferDetected: false
  };
}

function fallbackGoldRadar() {
  return {
    title: "Tokenized Gold Radar",
    headline: "금 토큰 시장 데이터를 불러오지 못했습니다.",
    marketMood: "unknown",
    kgldAngle: "KGLD는 확인되지 않은 외부 시장 분위기를 추정하지 않고, 준비자산·상환 가능성·실물 기반 신뢰 메시지를 유지합니다.",
    observations: ["PAXG/XAUT/KGLD 비교 데이터가 아직 준비되지 않았습니다."],
    operatorAction: "Alchemy 캐시 갱신 상태를 확인하고, 데이터가 충분할 때만 시장 분위기를 해석하세요.",
    confidence: "low",
    tokens: {
      KGLD: unknownTokenState(),
      PAXG: unknownTokenState(),
      XAUT: unknownTokenState()
    }
  };
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
    },
    tokenizedGoldRadar: fallbackGoldRadar()
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

function classifyTokenTransfers(transfers) {
  const largeTransferDetected = transfers.some((transfer) => transferValueNumber(transfer) >= LARGE_TRANSFER_THRESHOLD);
  return {
    activity: transfers.length > 0 ? "active" : "quiet",
    transferCount: transfers.length,
    largeTransferDetected
  };
}

function classifyGoldMarketMood(tokens) {
  const values = Object.values(tokens);
  if (values.every((token) => token.activity === "unknown")) return "unknown";
  if (values.some((token) => token.largeTransferDetected)) return "volatile";
  if (values.some((token) => token.activity === "active")) return "active";
  return "quiet";
}

function buildTokenizedGoldRadar(tokens) {
  const marketMood = classifyGoldMarketMood(tokens);
  const activeNames = Object.entries(tokens)
    .filter(([, token]) => token.activity === "active")
    .map(([name]) => name);
  const largeNames = Object.entries(tokens)
    .filter(([, token]) => token.largeTransferDetected)
    .map(([name]) => name);
  const unknownNames = Object.entries(tokens)
    .filter(([, token]) => token.activity === "unknown")
    .map(([name]) => name);

  let headline = "금 기반 토큰 시장은 전반적으로 조용하게 관찰됩니다.";
  let kgldAngle = "KGLD는 거래 활성도보다 준비자산·상환 가능성·실물 기반 신뢰 메시지를 강조하기 좋은 구간입니다.";
  let operatorAction = "KGLD 커뮤니케이션은 과장된 활동성보다 실물 기반 구조와 상환 절차의 설명 가능성에 집중하세요.";
  let confidence = "medium";

  if (marketMood === "active") {
    headline = "일부 금 기반 토큰에서 최근 Transfer 활동이 관찰됩니다.";
    kgldAngle = "KGLD는 외부 금 토큰 활동을 단순 추종하기보다, 운영 투명성과 준비자산 설명력을 함께 보여주는 접근이 적합합니다.";
    operatorAction = "PAXG/XAUT 활동을 시장 관심 신호로 참고하되 KGLD의 미확인 상장·거래 우위 표현은 피하세요.";
  } else if (marketMood === "volatile") {
    headline = "금 기반 토큰 일부에서 대형 이동이 관찰되어 시장 해석은 신중해야 합니다.";
    kgldAngle = "KGLD는 대형 이동의 의도를 단정하지 않고, 실물 기반 신뢰와 상환 가능성 중심의 안정적인 메시지를 유지하는 편이 적합합니다.";
    operatorAction = "대형 이동을 매수·매도 의도로 표현하지 말고, 준비자산·상환·운영 투명성 메시지를 우선하세요.";
  } else if (marketMood === "unknown") {
    headline = "금 토큰 비교 데이터가 충분하지 않습니다.";
    kgldAngle = "KGLD는 부족한 외부 데이터를 추정하지 않고 기본 신뢰 메시지를 유지합니다.";
    operatorAction = "PAXG/XAUT 조회 상태를 확인하고, 데이터가 충분해진 뒤 비교 내러티브를 사용하세요.";
    confidence = "low";
  }

  const observations = [
    activeNames.length ? `활동 감지: ${activeNames.join(", ")}` : "최근 샘플에서 뚜렷한 금 토큰 활동은 제한적입니다.",
    largeNames.length ? `대형 이동 후보: ${largeNames.join(", ")}` : "100 토큰 이상 대형 이동 후보는 제한적입니다.",
    unknownNames.length ? `조회 제한: ${unknownNames.join(", ")}` : "KGLD/PAXG/XAUT 샘플 조회가 완료되었습니다."
  ];

  return {
    title: "Tokenized Gold Radar",
    headline,
    marketMood,
    kgldAngle,
    observations: observations.slice(0, 3),
    operatorAction,
    confidence,
    tokens
  };
}

function buildNarrative({ gasWeather, transfers, tokenizedGoldRadar }) {
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
    tokenizedGoldRadar,
    observed: {
      kgldTransferSampleSize: transfers.length,
      kgldActivity: activity.state,
      kgldObservedVolume: `${formatToken(activity.volume)} KGLD`
    }
  };
}

async function fetchTokenTransfers({ address, fromBlock, tokenName }) {
  try {
    const result = await rpc("alchemy_getAssetTransfers", [{
      fromBlock: `0x${fromBlock.toString(16)}`,
      toBlock: "latest",
      category: ["erc20"],
      contractAddresses: [address],
      withMetadata: true,
      excludeZeroValue: false,
      maxCount: TOKEN_TRANSFER_LIMIT_HEX,
      order: "desc"
    }]);
    return result.transfers || [];
  } catch (error) {
    console.warn(`${tokenName} transfer lookup fallback: ${error.message}`);
    return null;
  }
}

async function fetchMinimalNarrativeInputs() {
  const [gasHex, latestBlockHex] = await Promise.all([
    rpc("eth_gasPrice", []),
    rpc("eth_blockNumber", [])
  ]);
  const latestBlock = BigInt(latestBlockHex);
  const fromBlock = latestBlock > 7200n ? latestBlock - 7200n : 0n;
  const tokenTransferEntries = await Promise.all(Object.entries(TOKENIZED_GOLD_TOKENS).map(async ([tokenName, address]) => {
    const transfers = await fetchTokenTransfers({ address, fromBlock, tokenName });
    return [tokenName, transfers];
  }));
  const tokenTransfers = Object.fromEntries(tokenTransferEntries);
  const tokenStates = Object.fromEntries(Object.entries(tokenTransfers).map(([tokenName, transfers]) => [
    tokenName,
    transfers ? classifyTokenTransfers(transfers) : unknownTokenState()
  ]));

  return {
    gasWeather: classifyGas(BigInt(gasHex)),
    transfers: tokenTransfers.KGLD || [],
    tokenizedGoldRadar: buildTokenizedGoldRadar(tokenStates)
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
