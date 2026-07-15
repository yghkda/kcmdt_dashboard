import fs from "node:fs/promises";
import path from "node:path";

const ROOT_CACHE_PATH = path.resolve("data/narrative-cache.json");
const DASHBOARD_CACHE_PATH = path.resolve("outputs/kgld-dashboard/data/narrative-cache.json");
const ROOT_HISTORY_PATH = path.resolve("data/narrative-history.json");
const DASHBOARD_HISTORY_PATH = path.resolve("outputs/kgld-dashboard/data/narrative-history.json");
const ROOT_NEWS_PATH = path.resolve("data/news-context.json");
const ROOT_NEWS_HISTORY_PATH = path.resolve("data/news-history.json");
const DASHBOARD_NEWS_HISTORY_PATH = path.resolve("outputs/kgld-dashboard/data/news-history.json");
const ROOT_CONTENT_HISTORY_PATH = path.resolve("data/content-history.json");
const DASHBOARD_CONTENT_HISTORY_PATH = path.resolve("outputs/kgld-dashboard/data/content-history.json");
const TOKEN_ADDRESS = "0xD1479fD673D9767E6c6E46eF6Bc640ff1F6Eb9CE";
const TOKENIZED_GOLD_TOKENS = {
  KGLD: TOKEN_ADDRESS,
  PAXG: "0x45804880De22913dAFE09f4980848ECE6EcbAf78",
  XAUT: "0x68749665FF8D2d112Fa859AA293F07A622782F38"
};
const STABLECOIN_TOKENS = {
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7"
};
const ISSUE_ADDRESS = "0xd5A62Dd28BF16229b4Dd9687DECC233548B9AA95".toLowerCase();
const REDEEM_ADDRESS = "0xe257fe24611CfabCa4a48869C1222D1cC2602E70".toLowerCase();
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const SCALE = 10n ** 18n;
const TOKEN_TRANSFER_LIMIT = 10;
const TOKEN_TRANSFER_LIMIT_HEX = "0xa";
const LARGE_TRANSFER_THRESHOLD = 100;
const LARGE_STABLECOIN_TRANSFER_THRESHOLD = 1_000_000;

function createDiagnostics() {
  return {
    generatedBy: "update-narrative.mjs",
    hasAlchemyUrl: Boolean(process.env.ALCHEMY_ETH_MAINNET_URL || process.env.ALCHEMY_API_KEY),
    usedFallback: false,
    errors: [],
    rpcChecks: {}
  };
}

function logStep(message) {
  console.log(`[narrative] ${message}`);
}

function addDiagnosticError(diagnostics, message) {
  if (!diagnostics || !message) return;
  if (!diagnostics.errors.includes(message)) {
    diagnostics.errors.push(message);
  }
}

function getRpcUrl(diagnostics) {
  if (process.env.ALCHEMY_ETH_MAINNET_URL) return process.env.ALCHEMY_ETH_MAINNET_URL;
  if (process.env.ALCHEMY_API_KEY) return `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  addDiagnosticError(diagnostics, "Missing ALCHEMY_ETH_MAINNET_URL or ALCHEMY_API_KEY");
  throw new Error("Missing ALCHEMY_ETH_MAINNET_URL or ALCHEMY_API_KEY");
}

async function rpc(method, params, diagnostics) {
  const response = await fetch(getRpcUrl(diagnostics), {
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
    headline: "시장 내러티브 데이터 수집 대기 중",
    marketMood: "unknown",
    kgldAngle: "상단 온체인 지표는 정상이며, Tokenized Gold Radar는 다음 narrative cache 갱신 후 표시됩니다.",
    observations: ["KGLD/PAXG/XAUT 비교 데이터 수집 대기 중"],
    operatorAction: "다음 narrative cache 갱신 후 tokenized gold 비교 신호를 확인하세요.",
    confidence: "low",
    tokens: {
      KGLD: unknownTokenState(),
      PAXG: unknownTokenState(),
      XAUT: unknownTokenState()
    }
  };
}

function fallbackRwaSectorPulse() {
  return {
    title: "RWA Sector Pulse",
    sectorMood: "limited_data",
    headline: "시장 내러티브 데이터 수집 대기 중",
    kgldPositioning: "상단 온체인 지표는 정상이며, RWA Sector Pulse는 다음 narrative cache 갱신 후 표시됩니다.",
    evidence: [
      "tokenized gold, stablecoin, gas 일부 신호만 우선 관찰합니다.",
      "Ondo, BUIDL, tokenized treasury, DeFi RWA protocol 데이터는 아직 연결 전입니다."
    ],
    contentIdea: "RWA transparency over hype",
    confidence: "low",
    signals: {
      tokenizedGold: {
        status: "unknown",
        source: "tokenizedGoldRadar"
      },
      stablecoins: {
        status: "unknown",
        usdcTransferCount: 0,
        usdtTransferCount: 0
      },
      gas: {
        status: "unknown"
      },
      rwaProtocols: {
        status: "limited_data",
        note: "Dune/The Graph 또는 protocol-specific 데이터 연결 전입니다."
      }
    }
  };
}

function fallbackNarrative(reason = "시장 내러티브 데이터 수집 대기 중", diagnostics = createDiagnostics()) {
  diagnostics.usedFallback = true;
  return {
    generatedAt: asKstString(new Date()),
    source: "fallback",
    todayActionBrief: {
      title: "Today's Action Brief",
      status: "unknown",
      headline: "시장 내러티브 데이터 수집 대기 중입니다.",
      operationsAction: "상단 온체인 지표를 기준으로 Issue/Redeem 잔액을 우선 확인하세요.",
      marketingAction: "narrative cache 갱신 후 콘텐츠 메시지를 확정하세요.",
      riskAction: "fallback 상태에서는 대형 이동 판단을 보류하세요.",
      doNotDo: [
        "미확인 상장/거래소명 언급",
        "거래량 우위 또는 시장 선도 표현",
        "수익률 또는 가격 상승 암시",
        "무조건 상환 보장 표현"
      ],
      confidence: "low"
    },
    marketWeather: {
      title: "Market Weather for KGLD",
      stablecoinWeather: "unknown",
      goldTokenWeather: "unknown",
      rwaWeather: "unknown",
      gasWeather: "unknown",
      todayPositioning: reason,
      contentAngle: "상단 온체인 지표는 정상이며, Market Weather는 다음 narrative cache 갱신 후 표시됩니다.",
      confidence: "low"
    },
    contentIdea: {
      title: "KGLD Content Desk",
      contentAngle: "Real asset trust onchain",
      oneLineInsight: "시장 내러티브 데이터 수집 대기 중입니다.",
      xPostEnglish: "Narrative data is pending. Onchain dashboard metrics remain available.",
      xPostKorean: "시장 내러티브 데이터는 수집 대기 중이며, 상단 온체인 지표는 정상 표시됩니다.",
      internalNote: "narrative cache가 fallback 상태입니다. 콘텐츠 발행 전 다음 자동 갱신 결과를 확인하세요.",
      landingCopy: "KGLD brings real-world value into an onchain format designed for verification and operational transparency.",
      whyNow: "다음 narrative cache 갱신 후 콘텐츠 아이디어가 표시됩니다.",
      complianceCaution: [
        "준비자산, 상환 조건, 운영 정책은 공식 문서와 일치해야 합니다.",
        "시장 활성도나 거래소 관련 표현은 확인된 근거가 있을 때만 사용하세요."
      ],
      doNotSay: [
        "미확인 상장/거래소명 언급",
        "거래량 우위 또는 시장 선도 표현",
        "수익률 또는 가격 상승 암시",
        "무조건 상환 보장 표현"
      ]
    },
    tokenizedGoldRadar: fallbackGoldRadar(),
    rwaSectorPulse: fallbackRwaSectorPulse(),
    diagnostics
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

function classifyStablecoinTransfers(transfers) {
  if (!transfers) {
    return {
      activity: "unknown",
      transferCount: 0,
      largeTransferDetected: false
    };
  }
  return {
    activity: transfers.length > 0 ? "active" : "quiet",
    transferCount: transfers.length,
    largeTransferDetected: transfers.some((transfer) => transferValueNumber(transfer) >= LARGE_STABLECOIN_TRANSFER_THRESHOLD)
  };
}

function classifyStablecoinStatus(states) {
  const values = Object.values(states);
  if (values.every((state) => state.activity === "unknown")) return "unknown";
  if (values.some((state) => state.largeTransferDetected)) return "volatile";
  if (values.some((state) => state.activity === "active")) return "active";
  return "quiet";
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
    activeNames.length ? `전송 샘플 확인: ${activeNames.join(", ")}` : "최근 샘플에서 뚜렷한 금 토큰 활동은 제한적입니다.",
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

function buildRwaSectorPulse({ tokenizedGoldRadar, stablecoinStates, gasWeather }) {
  const stablecoinStatus = classifyStablecoinStatus(stablecoinStates);
  const goldStatus = tokenizedGoldRadar.marketMood || "unknown";

  let sectorMood = "limited_data";
  let headline = "RWA 섹터 판단을 위한 데이터가 아직 제한적입니다.";
  let kgldPositioning = "현재는 KGLD의 준비자산, 상환 UX, 운영 투명성 중심 메시지가 적절합니다.";
  let contentIdea = "RWA transparency over hype";
  let confidence = "low";

  if (goldStatus === "active" || goldStatus === "volatile") {
    headline = "금 기반 토큰 전송 샘플이 확인되지만, 시장 활성도는 단정하지 않습니다.";
    kgldPositioning = "KGLD는 tokenized gold 카테고리 내 비교 가능한 자산으로 포지셔닝할 수 있습니다.";
    contentIdea = "Tokenized gold as a verifiable RWA category";
    confidence = "medium";
  } else if (goldStatus === "quiet" && stablecoinStatus === "active") {
    headline = "스테이블코인 움직임은 있으나 금 기반 토큰 활동은 제한적입니다.";
    kgldPositioning = "KGLD는 거래량 경쟁보다 실물 기반 신뢰와 상환 가능성을 강조하기 좋은 구간입니다.";
    contentIdea = "Real asset trust when liquidity moves elsewhere";
    confidence = "medium";
  } else if (goldStatus === "unknown" && stablecoinStatus === "unknown") {
    headline = "RWA 섹터 판단을 위한 데이터가 아직 제한적입니다.";
  }

  const evidence = [
    `Tokenized gold signal: ${goldStatus}`,
    `Stablecoin proxy: ${stablecoinStatus} (USDC ${stablecoinStates.USDC.transferCount}, USDT ${stablecoinStates.USDT.transferCount})`,
    `Gas condition: ${gasWeather}`
  ];

  return {
    title: "RWA Sector Pulse",
    sectorMood,
    headline,
    kgldPositioning,
    evidence: evidence.slice(0, 3),
    contentIdea,
    confidence,
    signals: {
      tokenizedGold: {
        status: goldStatus,
        source: "tokenizedGoldRadar"
      },
      stablecoins: {
        status: stablecoinStatus,
        usdcTransferCount: stablecoinStates.USDC.transferCount,
        usdtTransferCount: stablecoinStates.USDT.transferCount
      },
      gas: {
        status: gasWeather
      },
      rwaProtocols: {
        status: "limited_data",
        note: "Ondo, BUIDL, tokenized treasury, DeFi RWA protocol 데이터는 아직 연결 전입니다."
      }
    }
  };
}

function buildNarrative({ gasWeather, transfers, tokenizedGoldRadar, rwaSectorPulse, diagnostics }) {
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
    rwaSectorPulse,
    diagnostics,
    observed: {
      kgldTransferSampleSize: transfers.length,
      kgldActivity: activity.state,
      kgldObservedVolume: `${formatToken(activity.volume)} KGLD`
    }
  };
}

function classifyTransferSampleConservative(transfers, largeThreshold) {
  if (!transfers) {
    return {
      activity: "unknown",
      transferCount: 0,
      largeTransferDetected: false
    };
  }

  const transferCount = transfers.length;
  const largeTransferDetected = transfers.some((transfer) => transferValueNumber(transfer) >= largeThreshold);

  if (largeTransferDetected) {
    return { activity: "notable", transferCount, largeTransferDetected };
  }
  if (transferCount === 0) {
    return { activity: "quiet", transferCount, largeTransferDetected };
  }
  if (transferCount >= TOKEN_TRANSFER_LIMIT) {
    return { activity: "sample_full", transferCount, largeTransferDetected };
  }
  return { activity: "observed", transferCount, largeTransferDetected };
}

function classifyTokenTransfersConservative(transfers) {
  return classifyTransferSampleConservative(transfers, LARGE_TRANSFER_THRESHOLD);
}

function classifyStablecoinTransfersConservative(transfers) {
  return classifyTransferSampleConservative(transfers, LARGE_STABLECOIN_TRANSFER_THRESHOLD);
}

function summarizeConservativeSignal(states) {
  const values = Object.values(states);
  if (values.every((state) => state.activity === "unknown")) return "unknown";
  if (values.some((state) => state.activity === "volatile")) return "volatile";
  if (values.some((state) => state.activity === "notable")) return "notable";
  if (values.some((state) => state.activity === "active")) return "active";
  if (values.some((state) => state.activity === "sample_full")) return "sample_full";
  if (values.some((state) => state.activity === "observed")) return "observed";
  return "quiet";
}

function tokenObservation(symbol, state) {
  if (!state || state.activity === "unknown") return `${symbol}: 조회 실패 또는 데이터 없음`;
  if (state.activity === "quiet") return `${symbol}: 최근 관찰 범위 내 Transfer 없음`;
  if (state.activity === "sample_full") return `${symbol}: 최근 전송 샘플 ${state.transferCount}건 확인`;
  if (state.activity === "notable") return `${symbol}: 대형 이동 기준에 해당하는 샘플 확인`;
  if (state.activity === "observed") return `${symbol}: 최근 전송 샘플 ${state.transferCount}건 확인`;
  return `${symbol}: ${state.activity}`;
}

function buildTokenizedGoldRadarConservative(tokens) {
  const marketMood = summarizeConservativeSignal(tokens);
  const sampleNames = Object.entries(tokens)
    .filter(([, token]) => token.activity === "observed" || token.activity === "sample_full")
    .map(([name]) => name);
  const notableNames = Object.entries(tokens)
    .filter(([, token]) => token.activity === "notable" || token.activity === "volatile")
    .map(([name]) => name);
  const externalSampleNames = sampleNames.filter((name) => name !== "KGLD");
  const sampleFullNames = Object.entries(tokens)
    .filter(([, token]) => token.activity === "sample_full")
    .map(([name]) => name);
  const kgldQuiet = tokens.KGLD?.activity === "quiet";

  let headline = "금 기반 토큰 전송 샘플이 제한적으로 관찰됩니다.";
  let kgldAngle = "KGLD는 거래 활성도 경쟁보다 실물 기반 신뢰와 상환 가능성을 차분히 설명하는 접근이 적합합니다.";
  let operatorAction = "시장 활성도를 단정하지 말고, 금 기반 토큰 카테고리의 관찰 신호로만 참고하세요.";
  let interpretation = "관찰된 전송 표본이 제한적이므로 금 토큰 카테고리의 공통 흐름을 해석하기에는 아직 이릅니다.";
  let confidence = marketMood === "unknown" ? "low" : "medium";

  if (kgldQuiet && externalSampleNames.length) {
    headline = "PAXG와 XAUT의 최근 전송 샘플이 확인되었고, KGLD는 조용한 상태입니다.";
    kgldAngle = "KGLD는 외부 금 토큰 활동을 단순 추종하기보다, 실물 기반 신뢰와 상환 가능성을 차분히 설명하는 접근이 적합합니다.";
    interpretation = "외부 금 토큰에서는 전송이 이어지지만 KGLD는 같은 관찰 구간에서 움직임이 없습니다. 금 토큰 카테고리의 온체인 이동과 KGLD 운영 흐름이 현재는 분리되어 있다는 신호로 볼 수 있습니다.";
  } else if (marketMood === "notable" || marketMood === "volatile") {
    headline = "일부 금 기반 토큰에서 대형 이동 기준에 해당하는 샘플이 확인됩니다.";
    kgldAngle = "KGLD는 대형 이동의 의도를 단정하지 않고, 실물 기반 신뢰와 상환 가능성 중심의 안정적인 메시지를 유지하는 편이 적합합니다.";
    interpretation = "일반 전송 표본뿐 아니라 대형 이동 기준에 해당하는 이벤트가 포함됐습니다. 방향성보다 관련 TX와 주소 맥락을 우선 확인해야 하는 구간입니다.";
  } else if (marketMood === "unknown") {
    headline = "금 토큰 비교 데이터를 충분히 확인하지 못했습니다.";
    kgldAngle = "KGLD는 부족한 외부 데이터를 추정하지 않고 기본 신뢰 메시지를 유지합니다.";
    operatorAction = "PAXG/XAUT 조회 상태를 확인하고, 데이터가 충분해진 뒤 비교 내러티브를 사용하세요.";
  } else if (marketMood === "quiet") {
    headline = "금 기반 토큰 전송 샘플은 전반적으로 조용하게 관찰됩니다.";
    interpretation = "KGLD, PAXG, XAUT 모두에서 의미 있는 전송 표본이 제한적이어서 카테고리 전반의 온체인 이동 강도는 낮게 관찰됩니다.";
  }

  if (sampleFullNames.length >= 2 && !kgldQuiet) {
    interpretation = `${sampleFullNames.join(", ")}에서 최대 조회 개수까지 전송 표본이 채워졌습니다. 여러 금 토큰에서 온체인 이동이 이어진다는 뜻이지만, 과거 기준선이 없어 활동 증가나 수요 방향으로 해석할 수는 없습니다.`;
  }

  const observations = [
    tokenObservation("KGLD", tokens.KGLD),
    externalSampleNames.length
      ? `${externalSampleNames.join("/")} : 최근 전송 샘플 확인`
      : "PAXG/XAUT: 최근 전송 샘플 제한적",
    notableNames.length
      ? `대형 이동 기준 해당: ${notableNames.join(", ")}`
      : "대형 이동 기준에 해당하는 이벤트는 제한적"
  ];

  return {
    title: "Tokenized Gold Radar",
    headline,
    marketMood,
    kgldAngle,
    interpretation,
    observations,
    operatorAction,
    confidence,
    tokens
  };
}

function buildRwaSectorPulseConservative({ tokenizedGoldRadar, stablecoinStates, gasWeather }) {
  const stablecoinStatus = summarizeConservativeSignal(stablecoinStates);
  const goldStatus = tokenizedGoldRadar.marketMood || "unknown";

  let headline = "RWA 섹터 판단을 위한 데이터가 아직 제한적입니다.";
  let kgldPositioning = "현재는 KGLD의 준비자산, 상환 UX, 운영 투명성 중심 메시지가 적절합니다.";
  let decisionGuide = "섹터 방향을 단정하지 말고, KGLD 자체의 준비자산 확인 가능성·상환 절차·운영 추적성만 판단 근거로 사용하세요.";
  let confidence = "low";

  if ((["observed", "sample_full", "notable"].includes(goldStatus)) &&
      (["observed", "sample_full", "notable"].includes(stablecoinStatus))) {
    headline = "금 기반 토큰과 스테이블코인 전송 샘플은 확인되었지만, RWA 섹터 전체 판단에는 추가 데이터가 필요합니다.";
    kgldPositioning = "KGLD는 섹터 과열 신호보다 준비자산·상환 UX·운영 투명성 중심 메시지가 적합합니다.";
    decisionGuide = "현재 샘플은 시장 강약 판단에 쓰지 말고, KGLD의 준비자산·상환 절차·운영 투명성을 설명하는 보조 맥락으로만 활용하세요.";
    confidence = "medium";
  } else if (goldStatus === "notable" || stablecoinStatus === "notable") {
    headline = "일부 자산에서 대형 이동 기준에 해당하는 샘플이 확인되지만, RWA 섹터 전체 방향성은 단정하지 않습니다.";
    kgldPositioning = "KGLD는 특정 지갑 의도를 추정하기보다 준비자산·상환 가능성·운영 추적성을 강조하는 편이 적합합니다.";
    decisionGuide = "대형 이동의 의도를 추정하지 말고 관련 TX·주소 맥락을 확인한 뒤, 확인 가능한 사실만 콘텐츠와 운영 판단에 반영하세요.";
    confidence = "medium";
  }

  return {
    title: "RWA Sector Pulse",
    sectorMood: "limited_data",
    headline,
    kgldPositioning,
    decisionGuide,
    evidence: [
      `Tokenized gold: ${goldStatus} sample signal`,
      `Stablecoins: ${stablecoinStatus} sample signal (USDC ${stablecoinStates.USDC.transferCount}, USDT ${stablecoinStates.USDT.transferCount})`,
      `Gas condition: ${gasWeather}`
    ],
    contentIdea: "RWA transparency over hype",
    confidence,
    signals: {
      tokenizedGold: {
        status: goldStatus,
        source: "tokenizedGoldRadar"
      },
      stablecoins: {
        status: stablecoinStatus,
        usdcTransferCount: stablecoinStates.USDC.transferCount,
        usdtTransferCount: stablecoinStates.USDT.transferCount
      },
      gas: {
        status: gasWeather
      },
      rwaProtocols: {
        status: "limited_data",
        note: "Ondo, BUIDL, tokenized treasury, DeFi RWA protocol 데이터는 아직 연결 전입니다."
      }
    }
  };
}

function buildMarketSignalRead({ kgldActivity, goldTokenWeather, stablecoinWeather, gasWeather }) {
  const goldSampled = ["observed", "sample_full", "notable"].includes(goldTokenWeather);
  const stablecoinSampled = ["observed", "sample_full", "notable"].includes(stablecoinWeather);
  const sampleFull = goldTokenWeather === "sample_full" || stablecoinWeather === "sample_full";

  if (goldSampled && stablecoinSampled && gasWeather === "low") {
    return `금 토큰과 스테이블코인 양쪽에서 전송 표본이 충분히 관찰되고 gas는 낮습니다. 온체인 이동을 실행하기 쉬운 환경이지만, KGLD activity는 ${kgldActivity}이므로 외부 유동성 신호가 KGLD 이동으로 이어졌다고 보기는 어렵습니다.`;
  }
  if (goldSampled && stablecoinSampled) {
    return `금 토큰과 스테이블코인 양쪽에서 전송 표본이 확인됐습니다. 여러 자산군의 온체인 이동은 관찰되지만 ${sampleFull ? "조회 표본이 가득 찬 것" : "표본이 존재하는 것"}만으로 시장 방향이나 수요 증가를 판단할 수는 없습니다.`;
  }
  if (goldSampled) {
    return `금 기반 토큰에서는 전송 표본이 확인되지만 stablecoin 신호는 ${stablecoinWeather}입니다. 현재는 금 토큰 카테고리 내부 움직임으로만 해석하는 편이 안전합니다.`;
  }
  if (stablecoinSampled) {
    return `스테이블코인 전송 표본은 확인되지만 금 기반 토큰 신호는 ${goldTokenWeather}입니다. 유동성 이동이 KGLD나 금 토큰 수요로 연결됐다고 해석할 근거는 아직 없습니다.`;
  }
  if (kgldActivity === "quiet") {
    return `KGLD는 조용하고 외부 금 토큰·스테이블코인 신호도 제한적입니다. 오늘의 시장 맥락은 방향성 판단보다 운영 상태 확인에 가깝습니다.`;
  }
  return `KGLD activity는 ${kgldActivity}, 금 토큰 신호는 ${goldTokenWeather}, stablecoin 신호는 ${stablecoinWeather}, gas는 ${gasWeather}로 관찰됩니다. 현재 표본만으로 시장 방향은 단정하지 않습니다.`;
}

function buildNarrativeConservative({ gasWeather, transfers, tokenizedGoldRadar, rwaSectorPulse, diagnostics }) {
  const activity = classifyKgldActivity(transfers);
  const generatedAt = asKstString(new Date());
  const goldTokenWeather = tokenizedGoldRadar.marketMood || "unknown";
  const stablecoinWeather = rwaSectorPulse.signals?.stablecoins?.status || "unknown";
  const signalRead = buildMarketSignalRead({
    kgldActivity: activity.state,
    goldTokenWeather,
    stablecoinWeather,
    gasWeather
  });
  const confidence = gasWeather === "unknown" ? "low" : "medium";
  const contentAngle = "Gold as a quiet onchain asset";
  const oneLineInsight = "시장 샘플이 관찰되더라도 KGLD 메시지는 거래량보다 실물 기반 신뢰와 상환 가능성에 두는 편이 적합합니다.";
  const whyNowParts = [
    `최근 KGLD activity는 ${activity.state}로 관찰됩니다.`,
    `gas 상태는 ${gasWeather}입니다.`,
    goldTokenWeather === "sample_full" || goldTokenWeather === "observed"
      ? "PAXG/XAUT 전송 샘플이 확인되었습니다."
      : `tokenized gold signal은 ${goldTokenWeather}입니다.`
  ];

  return {
    generatedAt,
    source: "alchemy",
    marketWeather: {
      title: "Market Weather for KGLD",
      stablecoinWeather,
      goldTokenWeather,
      rwaWeather: rwaSectorPulse.sectorMood || "limited_data",
      gasWeather,
      todayPositioning: signalRead,
      signalRead,
      contentAngle,
      confidence
    },
    contentIdea: {
      title: "KGLD Content Idea",
      contentAngle,
      oneLineInsight,
      tweetDraftEnglish: "Not every onchain asset needs to move fast. Some are built to make real-world trust easier to verify.",
      tweetDraftKorean: "모든 온체인 자산이 빠르게 움직일 필요는 없습니다. 어떤 자산은 실물 기반 신뢰와 상환 가능성을 차분히 설명하는 데 의미가 있습니다.",
      whyNow: whyNowParts.join(" "),
      doNotSay: [
        "KGLD is widely traded",
        "KGLD is listed on a specific exchange unless confirmed",
        "Guaranteed gold redemption without policy conditions",
        "Investment return or price appreciation"
      ]
    },
    tokenizedGoldRadar,
    rwaSectorPulse,
    diagnostics,
    observed: {
      kgldTransferSampleSize: transfers.length,
      kgldActivity: activity.state,
      kgldObservedVolume: `${formatToken(activity.volume)} KGLD`
    }
  };
}

function fallbackNewsContext() {
  return {
    generatedAt: "unknown",
    source: "fallback",
    items: [],
    newsNarrative: {
      headline: "뉴스 컨텍스트가 아직 준비되지 않았습니다.",
      keyMessage: "온체인 데이터만 기준으로 콘텐츠를 제안합니다.",
      kgldAngle: "뉴스 자료가 추가되면 사업 맥락과 온체인 상태를 함께 표시합니다.",
      doNotOverclaim: [
        "미확인 상장/거래소명 언급",
        "거래량 우위 또는 시장 선도 표현",
        "수익률 또는 가격 상승 암시",
        "무조건 상환 보장 표현"
      ]
    }
  };
}

function usableNewsItems(newsContext) {
  return (newsContext?.items || [])
    .filter((item) => item && item.usableForContent !== false)
    .slice(0, 3);
}

async function readNewsContext() {
  return readJsonFile(ROOT_NEWS_PATH, fallbackNewsContext());
}

function buildContentDesk({ activity, gasWeather, tokenizedGoldRadar, rwaSectorPulse, narrativeTrend, newsContext, narrativeSource, contentHistory }) {
  const goldMood = tokenizedGoldRadar?.marketMood || "unknown";
  const sectorMood = rwaSectorPulse?.sectorMood || "unknown";
  const trendMood = narrativeTrend?.trendMood || "unknown";
  const relatedItems = usableNewsItems(newsContext);
  const hasNews = relatedItems.length > 0;
  const hasHighRelevanceNews = relatedItems.some((item) => item.relevance === "high");
  const hasAlchemy = narrativeSource === "alchemy";
  const hasGoldSamples = ["observed", "sample_full", "notable", "active", "volatile"].includes(goldMood);
  const quietKgld = activity?.state === "quiet";
  const todayKey = String(asKstString(new Date())).slice(0, 10);
  const existingToday = (contentHistory?.entries || []).find((item) => String(item.usedAt || "").slice(0, 10) === todayKey);
  const recentAngles = new Set((contentHistory?.entries || [])
    .filter((item) => String(item.usedAt || "").slice(0, 10) !== todayKey)
    .slice(-7)
    .map((item) => item.selectedAngle));
  const anglePool = [
    "Reserve Transparency",
    "Redemption UX",
    "Gold/RWA Education",
    "Multichain",
    "Product Vision",
    "Market Context",
    "Technology",
    "ITCEN Group Strategy"
  ];
  const selectedAngle = existingToday?.selectedAngle || anglePool.find((angle) => !recentAngles.has(angle)) || anglePool[0];
  const hasFreshNews = relatedItems.some((item) => item.sourceType === "official" || /^\d{4}-\d{2}-\d{2}/.test(item.publishedAt || ""));
  const contentMode = hasFreshNews && hasAlchemy
    ? "news_plus_onchain"
    : hasFreshNews
      ? "fresh_news"
      : hasAlchemy
        ? "evergreen"
        : "evergreen";
  const primaryAngle = selectedAngle;
  const newsNarrative = newsContext?.newsNarrative || fallbackNewsContext().newsNarrative;
  const onchainHeadline = quietKgld
    ? "KGLD 온체인 활동은 조용하며, 운영 상태를 보수적으로 관찰하는 구간입니다."
    : `KGLD 온체인 상태는 ${activity?.state || "unknown"}로 관찰됩니다.`;
  const onchainKeyMessage = `Gas는 ${gasWeather || "unknown"}, tokenized gold signal은 ${goldMood}, RWA sector signal은 ${sectorMood}, 7-day trend는 ${trendMood}입니다.`;
  const oneLineInsight = hasFreshNews ? newsNarrative.keyMessage : "오늘 신규 KGLD/ITCEN 관련 기사는 확인되지 않아 교육형 evergreen 소재를 제안합니다.";
  const primarySource = hasFreshNews ? relatedItems[0] : {
    title: "No verified new source in the latest run",
    publisher: "KGLD Dashboard",
    publishedAt: asKstString(new Date()),
    url: "",
    sourceType: "derived"
  };
  const angleCopy = {
    "Reserve Transparency": {
      en: "For a gold-backed RWA, trust starts with what can be verified: reserves, custody, and the path to redemption.",
      ko: "금 기반 RWA의 신뢰는 준비자산, 보관 구조, 상환 경로처럼 확인 가능한 정보에서 시작됩니다."
    },
    "Redemption UX": {
      en: "Tokenized gold is more than a token balance. The redemption path is part of the product.",
      ko: "토큰화 금은 잔액만으로 완성되지 않습니다. 사용자가 이해할 수 있는 상환 경로도 제품의 일부입니다."
    },
    "Gold/RWA Education": {
      en: "A gold token is not defined by speed alone. Reserve visibility and redemption design shape its real utility.",
      ko: "금 토큰의 가치는 전송 속도만으로 설명되지 않습니다. 준비자산 가시성과 상환 설계가 실제 활용성을 만듭니다."
    },
    "Multichain": {
      en: "Multichain access can improve reach, but trust still depends on consistent reserves, custody, and redemption rules.",
      ko: "멀티체인 접근성은 도달 범위를 넓힐 수 있지만, 신뢰는 일관된 준비자산·보관·상환 기준에서 나옵니다."
    }
  };
  const selectedCopy = angleCopy[selectedAngle] || {
    en: "KGLD explores how real-world gold can be represented with clearer onchain operations and verifiable context.",
    ko: "KGLD는 실물 금을 더 명확한 온체인 운영과 검증 가능한 맥락으로 설명하는 방식을 탐구합니다."
  };

  return {
    title: "Content Opportunities",
    contentMode,
    freshness: hasFreshNews ? "today" : "none",
    selectedAngle,
    primarySource,
    previouslyUsed: recentAngles.has(selectedAngle),
    primaryAngle,
    contentAngle: primaryAngle,
    oneLineInsight,
    newsContext: {
      headline: newsNarrative.headline || "뉴스 컨텍스트가 제한적입니다.",
      keyMessage: newsNarrative.keyMessage || "뉴스 기반 메시지는 보수적으로만 사용합니다.",
      relatedItems
    },
    onchainContext: {
      headline: onchainHeadline,
      keyMessage: onchainKeyMessage
    },
    whyToday: hasFreshNews
      ? "최근 공개자료와 현재 온체인 맥락을 함께 활용할 수 있습니다."
      : `신규 확인 기사 대신 최근 7일간 사용하지 않은 ${selectedAngle} 교육형 앵글을 선택했습니다.`,
    usableFacts: [
      `KGLD activity: ${activity?.state || "unknown"}`,
      `Tokenized gold signal: ${goldMood}`,
      `Gas condition: ${gasWeather || "unknown"}`
    ],
    kgldMessage: selectedCopy.ko,
    xPostEnglish: selectedCopy.en,
    xPostKorean: selectedCopy.ko,
    internalNote: hasNews
      ? "뉴스 소재는 '보도에 따르면', '공개 자료 기준', '추진/준비' 표현으로만 사용하세요. 온체인 데이터는 현재 운영 상태를 보조하는 근거로만 붙입니다."
      : "뉴스 컨텍스트가 없으므로 온체인 상태만 기준으로 콘텐츠를 작성하세요. 외부 파트너, 상장, 서비스 출시를 암시하지 마세요.",
    landingCopy: "KGLD is positioned as a gold-based RWA concept focused on reserve visibility, redemption context, and onchain operational transparency.",
    whyNow: [
      hasNews ? "수동 뉴스 watchlist에 KGLD/ITCEN/KorDA/LayerZero 관련 콘텐츠 소재가 등록되어 있습니다." : "뉴스 컨텍스트가 아직 제한적입니다.",
      `KGLD activity는 ${activity?.state || "unknown"}로 관찰됩니다.`,
      hasGoldSamples ? "PAXG/XAUT 전송 샘플은 tokenized gold 카테고리 관찰 신호로만 참고할 수 있습니다." : `tokenized gold signal은 ${goldMood}입니다.`,
      `Gas 상태는 ${gasWeather || "unknown"}입니다.`
    ].join(" "),
    complianceCaution: [
      ...(newsNarrative.doNotOverclaim || []),
      ...relatedItems.map((item) => item.caution).filter(Boolean),
      "뉴스에 나온 내용도 계획/추진/보도 기준으로만 표현하세요.",
      "온체인 활동이 조용하다는 사실을 수요 부족이나 실패로 해석하지 마세요."
    ],
    doNotSay: [
      "상장 완료 또는 특정 거래소 거래 가능 표현",
      "발행 완료, 상용화 완료, 모든 체인 활성화 표현",
      "거래량 우위 또는 시장 선도 표현",
      "수익률 또는 가격 상승 암시",
      "무조건 상환 보장 표현"
    ]
  };
}

function buildTodayActionBrief(narrative) {
  const market = narrative.marketWeather || {};
  const radar = narrative.tokenizedGoldRadar || {};
  const rwa = narrative.rwaSectorPulse || {};
  const trend = narrative.narrativeTrend || {};
  const idea = narrative.contentIdea || {};
  const kgldActivity = narrative.observed?.kgldActivity || radar.tokens?.KGLD?.activity || "unknown";
  const gasWeather = market.gasWeather || rwa.signals?.gas?.status || "unknown";
  const hasLargeTransfer = Boolean(
    radar.tokens?.KGLD?.largeTransferDetected ||
    radar.tokens?.PAXG?.largeTransferDetected ||
    radar.tokens?.XAUT?.largeTransferDetected ||
    (trend.notableLargeTransferDays || 0) > 0
  );
  const goldMood = radar.marketMood || rwa.signals?.tokenizedGold?.status || "unknown";
  const trendAccumulating = trend.trendMood === "unknown" || trend.confidence === "low";
  const doNotDo = [
    "미확인 상장/거래소명 언급",
    "거래량 우위 또는 시장 선도 표현",
    "수익률 또는 가격 상승 암시",
    "무조건 상환 보장 표현"
  ];

  let status = "unknown";
  let headline = "오늘의 액션 판단을 위한 narrative 데이터가 아직 제한적입니다.";
  let operationsAction = "Issue/Redeem 잔액과 준비자산 대사 흐름을 계속 추적하세요.";
  let marketingAction = "거래량보다 실물 기반 신뢰, 상환 가능성, 운영 투명성 메시지를 강조하세요.";
  let riskAction = "새로운 대형 이동이나 관리자성 이벤트가 관찰되는지 확인하세요.";
  let confidence = trendAccumulating ? "low" : "medium";

  if (trendAccumulating) {
    status = "unknown";
    headline = "추세 데이터가 축적 중이며, 현재는 단일 스냅샷 기반으로 보수적으로 해석합니다.";
  }

  if (kgldActivity === "quiet" && ["low", "normal"].includes(gasWeather) && !hasLargeTransfer) {
    status = "normal";
    headline = "오늘은 Issue/Redeem 잔액 대사를 우선 확인하고, 외부 메시지는 검증 가능한 준비자산·상환 절차에 한정하세요.";
    operationsAction = "Issue/Redeem 잔액과 준비자산 대사 흐름을 계속 추적하세요.";
    marketingAction = "거래량보다 실물 기반 신뢰, 상환 가능성, 운영 투명성 메시지를 강조하세요.";
    riskAction = "대형 이동이나 관리자성 이벤트가 없으면 추가 조치는 필요하지 않습니다.";
    confidence = trendAccumulating ? "low" : "medium";
  }

  if (["observed", "sample_full", "notable", "active", "volatile"].includes(goldMood)) {
    marketingAction = `${marketingAction} PAXG/XAUT 전송 샘플은 tokenized gold 카테고리 관찰 신호로만 참고하세요.`;
  }

  if (hasLargeTransfer) {
    status = "watch";
    headline = "일부 대형 이동 관찰 신호가 있어 관련 TX와 주소 맥락 확인이 필요합니다.";
    riskAction = "대형 이동 TX와 관련 주소 라벨을 확인하세요.";
    confidence = "medium";
  }

  if (idea.contentAngle && status !== "watch") {
    marketingAction = `${marketingAction} 오늘의 콘텐츠 각도는 '${idea.contentAngle}'로 정리할 수 있습니다.`;
  }

  return {
    title: "Today's Action Brief",
    status,
    headline,
    operationsAction,
    marketingAction,
    riskAction,
    doNotDo,
    confidence
  };
}

function buildIntelligenceModels(narrative, history) {
  const market = narrative.marketWeather || {};
  const radar = narrative.tokenizedGoldRadar || fallbackGoldRadar();
  const rwa = narrative.rwaSectorPulse || fallbackRwaSectorPulse();
  const snapshots = normalizeHistory(history).snapshots.slice(-7);
  const previous = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;
  const currentGold = radar.marketMood || "unknown";
  const currentStable = rwa.signals?.stablecoins?.status || "unknown";
  const currentGas = market.gasWeather || "unknown";
  const marketState = currentGold === "notable" || currentStable === "notable"
    ? "notable"
    : currentGold === "unknown" && currentStable === "unknown"
      ? "limited_data"
      : currentGold === "quiet" && currentStable === "quiet"
        ? "quiet"
        : currentGold !== currentStable
          ? "mixed"
          : "observed";
  const whatChanged = previous
    ? [
        previous.summary?.tokenizedGoldMood !== currentGold ? `금 토큰 ${previous.summary?.tokenizedGoldMood || "unknown"} → ${currentGold}` : "",
        previous.signals?.USDC?.status !== currentStable ? `stablecoin ${previous.signals?.USDC?.status || "unknown"} → ${currentStable}` : "",
        previous.signals?.gas?.status !== currentGas ? `gas ${previous.signals?.gas?.status || "unknown"} → ${currentGas}` : ""
      ].filter(Boolean).join(" · ") || "전일 대비 의미 있는 외부 신호 변화 없음"
    : "전일 비교를 위한 snapshot 축적 중";

  market.title = "Market Interpretation";
  market.marketState = marketState;
  market.headline = market.signalRead || market.todayPositioning || "외부 시장 신호를 보수적으로 관찰합니다.";
  market.whatChanged = whatChanged;
  market.marketInterpretation = market.signalRead || market.todayPositioning || "";
  market.kgldImpact = "외부 신호는 KGLD 컨트랙트 정상 여부를 바꾸지 않으며, 사업·포지셔닝 참고 정보로만 사용합니다.";
  market.watchNext = ["금 토큰 대형 이동 후보", "stablecoin 신호 변화", "gas 환경 변화"];

  const tokenEntries = Object.entries(radar.tokens || {});
  const activeExternal = tokenEntries.filter(([name, token]) => name !== "KGLD" && isObservedStatus(token.activity)).map(([name]) => name);
  const largeNames = tokenEntries.filter(([, token]) => token.largeTransferDetected).map(([name]) => name);
  radar.title = "Tokenized Gold Signal";
  radar.signalState = marketState === "limited_data" ? "limited_data" : largeNames.length ? "notable" : activeExternal.length ? "observed" : "quiet";
  radar.relativeActivity = activeExternal.length
    ? `${activeExternal.join("/")}에서는 전송 표본이 확인되며 KGLD는 ${radar.tokens?.KGLD?.activity || "unknown"} 상태입니다.`
    : "KGLD/PAXG/XAUT 간 상대 활동 차이가 제한적입니다.";
  radar.largeFlowPresence = largeNames.length ? `대형 이동 후보: ${largeNames.join(", ")}` : "대형 이동 후보는 제한적입니다.";
  radar.marketMeaning = radar.interpretation || radar.headline;
  radar.kgldReference = "외부 금 토큰 활동은 카테고리 참고 신호이며 KGLD 수요나 운영 위험으로 직접 연결하지 않습니다.";

  const observedAreas = [];
  if (currentGold !== "unknown" && currentGold !== "quiet") observedAreas.push("Tokenized Gold");
  if (currentStable !== "unknown" && currentStable !== "quiet") observedAreas.push("Stablecoin");
  if (currentGas !== "unknown") observedAreas.push("Settlement / Infrastructure");
  rwa.title = "RWA Opportunity Map";
  rwa.state = observedAreas.length ? "observed" : "limited_data";
  rwa.leadingArea = observedAreas[0] || "확인 가능한 선도 영역 없음";
  rwa.observedAreas = observedAreas;
  rwa.kgldOpportunity = [
    "실물 금 교환 UX",
    "준비자산 검증 가능성",
    "국내 금 유통 인프라 연결",
    "멀티체인 접근성 설명"
  ];
  rwa.differentiationGap = "현재 외부 데이터만으로 사업 진척도를 단정할 수 없으므로, 검증 가능한 준비자산·상환 절차·운영 추적성이 핵심 차별화 과제입니다.";
  rwa.missingData = ["Tokenized Treasury", "Institutional Funds", "Private Credit", "RWA DeFi protocol flows"];

  const trend = narrative.narrativeTrend || {};
  trend.title = "External Signal Trend";
  trend.whatChanged = whatChanged;
  trend.unchangedSignals = previous && whatChanged.includes("의미 있는")
    ? ["금 토큰 표본 상태", "stablecoin 표본 상태", "gas 상태"]
    : [];
  trend.notableChanges = whatChanged.includes("→") ? [whatChanged] : [];
  trend.nextTrigger = "외부 신호 상태 변화, 대형 이동 후보 또는 신규 뉴스가 확인될 때 상세 해석을 확장합니다.";
  trend.isCompact = trend.notableChanges.length === 0;

  return narrative;
}

function parsePublishedAt(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function simpleHash(value) {
  let hash = 2166136261;
  for (const char of String(value || "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function etherscanAddressUrl(address) {
  return `https://etherscan.io/address/${address}`;
}

function tokenSourceLink(tokenName) {
  const address = TOKENIZED_GOLD_TOKENS[tokenName] || STABLECOIN_TOKENS[tokenName] || TOKEN_ADDRESS;
  return {
    title: `${tokenName} contract events on Etherscan`,
    url: `${etherscanAddressUrl(address)}#events`
  };
}

function historySourceLink() {
  return {
    title: "Narrative history JSON",
    url: "./data/narrative-history.json"
  };
}

function isVerifiedNewsItem(item, now = new Date()) {
  if (!item || item.verified !== true || item.usableForContent === false) return false;
  if (!String(item.title || "").trim() || !String(item.publisher || "").trim()) return false;
  if (!/^https?:\/\//i.test(String(item.url || ""))) return false;
  if (!["official", "media"].includes(item.sourceType)) return false;
  const publishedAt = parsePublishedAt(item.publishedAt);
  if (!publishedAt) return false;
  const ageMs = now.getTime() - publishedAt.getTime();
  return ageMs >= 0 && ageMs <= 72 * 60 * 60 * 1000;
}

function isMeaningfulTokenEvent(tokenName, token) {
  if (!token) return { meaningful: false, reason: "missing_token_data" };
  if (token.largeTransferDetected) return { meaningful: true, reason: "large_transfer_detected" };
  return {
    meaningful: false,
    reason: token.transferCount >= TOKEN_TRANSFER_LIMIT
      ? "query_limit_sample_only"
      : token.transferCount > 0
        ? "transfer_sample_without_baseline"
        : `${String(token.activity || "unknown")}_without_change`
  };
}

function isMeaningfulMarketChange(narrative, history) {
  const snapshots = normalizeHistory(history).snapshots.slice(-7);
  if (snapshots.length < 2) return { meaningful: false, reason: "insufficient_comparable_history" };
  const previous = snapshots[snapshots.length - 2];
  const current = buildHistorySnapshot(narrative);
  const previousLarge = ["KGLD", "PAXG", "XAUT"].some((name) => previous.signals?.[name]?.largeTransferDetected);
  const currentLarge = ["KGLD", "PAXG", "XAUT"].some((name) => current.signals?.[name]?.largeTransferDetected);
  if (!previousLarge && currentLarge) return { meaningful: true, reason: "new_large_transfer_signal" };
  return { meaningful: false, reason: "no_baseline_backed_change" };
}

function buildMarketIntelligence({ narrative, history, newsContext, newsHistory }) {
  const candidates = [];
  const insights = [];
  const tokens = narrative.tokenizedGoldRadar?.tokens || {};

  for (const [tokenName, token] of Object.entries(tokens)) {
    const result = isMeaningfulTokenEvent(tokenName, token);
    candidates.push({
      candidate: `${tokenName} transfer activity`,
      meaningful: result.meaningful,
      reason: result.reason
    });
    if (result.meaningful) {
      insights.push({
        type: "tokenized_gold_event",
        severity: "notable",
        headline: `${tokenName}에서 기준 이상의 대형 이동이 관찰되었습니다.`,
        whyImportant: "일반적인 최근 전송 샘플과 구분되는 규모의 이동으로 추가 확인 가치가 있습니다.",
        kgldImpact: tokenName === "KGLD"
          ? "KGLD 관련 주소와 거래 목적을 확인해 운영상 의미가 있는지 검토하세요."
          : "외부 금 토큰 흐름은 카테고리 참고 신호이며 KGLD 수요로 직접 해석하지 않습니다.",
        evidence: [`largeTransferDetected: true`, `sample size: ${token.transferCount || 0}`],
        source: ["Alchemy Ethereum mainnet"],
        detectedAt: narrative.generatedAt
      });
    }
  }

  const marketChange = isMeaningfulMarketChange(narrative, history);
  const hasTokenizedGoldEvent = insights.some((insight) => insight.type === "tokenized_gold_event");
  candidates.push({
    candidate: "7-day market signal change",
    meaningful: marketChange.meaningful && !hasTokenizedGoldEvent,
    reason: hasTokenizedGoldEvent && marketChange.meaningful ? "covered_by_tokenized_gold_event" : marketChange.reason
  });
  if (marketChange.meaningful && !hasTokenizedGoldEvent) {
    insights.push({
      type: "market_change",
      severity: "notable",
      headline: "최근 기록과 비교해 새로운 대형 이동 신호가 확인되었습니다.",
      whyImportant: "단일 샘플 수가 아니라 이전 기록과 비교 가능한 변화입니다.",
      kgldImpact: "관련 거래와 주소를 확인한 뒤 운영 또는 콘텐츠 대응 필요성을 판단하세요.",
      evidence: ["Narrative history comparison"],
      source: ["narrative-history.json"],
      detectedAt: narrative.generatedAt
    });
  }

  const usedUrls = new Set((newsHistory?.entries || []).map((entry) => entry.url).filter(Boolean));
  const verifiedNews = (newsContext?.items || [])
    .filter((item) => isVerifiedNewsItem(item) && !usedUrls.has(item.url))
    .filter((item, index, items) => items.findIndex((candidate) => candidate.url === item.url) === index)
    .slice(0, 3);
  candidates.push({
    candidate: "verified project/RWA news",
    meaningful: verifiedNews.length > 0,
    reason: verifiedNews.length > 0 ? "verified_fresh_source" : "no_verified_fresh_source"
  });
  for (const item of verifiedNews) {
    const tags = new Set(item.tags || []);
    const isProjectNews = ["KGLD", "ITCEN", "KorDA", "LayerZero"].some((tag) => tags.has(tag));
    insights.push({
      type: isProjectNews ? "project_news" : "rwa_news_insight",
      severity: isProjectNews ? "important" : "info",
      headline: item.title,
      whyImportant: item.summary || "최근 72시간 내 확인된 공개 자료입니다.",
      kgldImpact: isProjectNews
        ? "공개 자료의 확인된 범위 안에서 KGLD 사업 메시지에 반영할 수 있습니다."
        : "KGLD와 직접 연결하지 말고 RWA 시장 참고 정보로 활용하세요.",
      evidence: [item.publisher, item.publishedAt],
      source: [{ title: item.title, url: item.url }],
      detectedAt: item.publishedAt
    });
  }

  const priority = {
    regulatory_impact: 1,
    project_news: 2,
    tokenized_gold_event: 3,
    rwa_news_insight: 4,
    market_change: 5
  };
  const detectedInsights = insights
    .sort((a, b) => (priority[a.type] || 99) - (priority[b.type] || 99))
    .slice(0, 3);
  const hasErrors = (narrative.diagnostics?.errors || []).length > 0;
  const hasCoreData = narrative.source === "alchemy" && narrative.diagnostics?.usedFallback !== true;
  const status = detectedInsights.length
    ? "insight_detected"
    : hasErrors
      ? "error"
      : hasCoreData
        ? "no_change"
        : "limited_data";

  return {
    brief: {
      title: "Market Intelligence Brief",
      status,
      headline: detectedInsights.length
        ? `${detectedInsights.length}개의 확인할 만한 외부 신호가 감지되었습니다.`
        : "오늘 주목할 만한 외부 시장 변화는 확인되지 않았습니다.",
      summary: detectedInsights.length
        ? "샘플 수 자체가 아니라 대형 이동, 비교 가능한 변화, 검증된 신규 자료만 선별했습니다."
        : "금 토큰·스테이블코인·RWA 관련 신호는 기존 관찰 범위와 유사합니다.",
      kgldImpact: detectedInsights.length
        ? "감지된 신호의 근거를 확인한 뒤 KGLD 운영 또는 콘텐츠에 반영할지 판단하세요."
        : "KGLD 운영 상태나 사업 방향에 즉시 반영할 외부 변화는 없습니다.",
      watching: [
        "금 토큰 대형 이동",
        "신규 RWA 상품·공식 발표",
        "규제·수탁·상환 정책 변화",
        "KGLD/ITCEN/KorDA 관련 검증 뉴스"
      ],
      detectedInsightCount: detectedInsights.length,
      lastGeneratedAt: narrative.generatedAt,
      confidence: hasCoreData ? "medium" : "low"
    },
    detectedInsights,
    candidates
  };
}

function buildMarketIntelligenceEnhanced({ narrative, history, newsContext, newsHistory }) {
  const candidates = [];
  const insights = [];
  const tokens = narrative.tokenizedGoldRadar?.tokens || {};

  for (const [tokenName, token] of Object.entries(tokens)) {
    const result = isMeaningfulTokenEvent(tokenName, token);
    candidates.push({
      candidate: `${tokenName} transfer activity`,
      meaningful: result.meaningful,
      reason: result.reason
    });

    if (!result.meaningful) continue;

    insights.push({
      type: "tokenized_gold_event",
      severity: "notable",
      headline: `${tokenName}에서 기준 이상의 대형 이동이 관찰되었습니다.`,
      whyImportant: "단순 샘플 충족이 아니라 금 기반 토큰 카테고리에서 별도 확인할 만한 규모의 이동입니다.",
      interpretation: tokenName === "KGLD"
        ? "KGLD 자체 이동이면 Issue/Redeem, 운영 지갑, 사용자 이동 중 무엇인지 먼저 구분해야 합니다."
        : `${tokenName} 흐름은 외부 금 토큰 수요나 보관·정산 움직임의 참고 신호입니다. KGLD 수요로 직접 해석하지는 않습니다.`,
      whatToCheck: [
        "Etherscan 이벤트 페이지에서 최근 Transfer의 from/to 주소 확인",
        "거래소성 주소인지, 커스터디/운영성 주소인지 라벨 확인",
        "KGLD 콘텐츠에는 외부 금 토큰 참고 신호로만 표현"
      ],
      kgldImpact: tokenName === "KGLD"
        ? "KGLD 운영 관련 주소와 거래 목적을 확인한 뒤 운영 대응 필요성을 판단하세요."
        : "외부 금 토큰 흐름은 카테고리 참고 신호이며, KGLD의 직접 수요나 성과로 해석하지 않습니다.",
      evidence: [`largeTransferDetected: true`, `sample size: ${token.transferCount || 0}`],
      source: [tokenSourceLink(tokenName), { title: "Alchemy Ethereum mainnet", url: "https://dashboard.alchemy.com/" }],
      detectedAt: narrative.generatedAt
    });
  }

  const marketChange = isMeaningfulMarketChange(narrative, history);
  candidates.push({
    candidate: "7-day market signal change",
    meaningful: marketChange.meaningful,
    reason: marketChange.reason
  });
  if (marketChange.meaningful) {
    insights.push({
      type: "market_change",
      severity: "notable",
      headline: "최근 기록과 비교해 새로운 대형 이동 신호가 확인되었습니다.",
      whyImportant: "단일 조회 결과가 아니라 이전 narrative history와 비교해 달라진 지점입니다.",
      interpretation: "반복되는 패턴인지, 하루짜리 이벤트인지 확인하면 콘텐츠 톤과 운영 모니터링 강도를 정할 수 있습니다.",
      whatToCheck: [
        "narrative-history.json에서 직전 스냅샷과 현재 스냅샷 비교",
        "대형 이동이 어느 토큰에서 발생했는지 확인",
        "동일 신호가 다음 스냅샷에서도 반복되는지 관찰"
      ],
      kgldImpact: "관련 거래와 주소를 확인한 뒤 운영 또는 콘텐츠 대응 필요성을 판단하세요.",
      evidence: ["Narrative history comparison"],
      source: [historySourceLink()],
      detectedAt: narrative.generatedAt
    });
  }

  const usedUrls = new Set((newsHistory?.entries || []).map((entry) => entry.url).filter(Boolean));
  const verifiedNews = (newsContext?.items || [])
    .filter((item) => isVerifiedNewsItem(item) && !usedUrls.has(item.url))
    .filter((item, index, items) => items.findIndex((candidate) => candidate.url === item.url) === index)
    .slice(0, 3);

  candidates.push({
    candidate: "verified project/RWA news",
    meaningful: verifiedNews.length > 0,
    reason: verifiedNews.length > 0 ? "verified_fresh_source" : "no_verified_fresh_source"
  });

  for (const item of verifiedNews) {
    const tags = new Set(item.tags || []);
    const isProjectNews = ["KGLD", "ITCEN", "KorDA", "LayerZero"].some((tag) => tags.has(tag));
    insights.push({
      type: isProjectNews ? "project_news" : "rwa_news_insight",
      severity: isProjectNews ? "important" : "info",
      headline: item.title,
      whyImportant: item.summary || "최근 확인된 공개 자료입니다.",
      interpretation: isProjectNews
        ? "KGLD 사업 방향, 실물 금 기반 RWA, 멀티체인 확장 같은 메시지의 근거로 사용할 수 있습니다."
        : "RWA 시장 분위기를 설명하는 보조 자료로만 사용하세요.",
      whatToCheck: [
        "기사 원문에서 보도 범위와 표현 수위 확인",
        "완료/확정 표현인지 계획/추진 표현인지 구분",
        "콘텐츠에 사용할 경우 출처 링크와 보수적 표현 유지"
      ],
      kgldImpact: isProjectNews
        ? "공개 자료에서 확인되는 범위 안에서만 KGLD 사업 메시지에 반영할 수 있습니다."
        : "KGLD와 직접 연결하지 말고 RWA 시장 참고 정보로만 사용하세요.",
      evidence: [item.publisher, item.publishedAt],
      source: [{ title: item.title, url: item.url }, ...(item.naverUrl ? [{ title: "Naver News result", url: item.naverUrl }] : [])],
      detectedAt: item.publishedAt
    });
  }

  const priority = {
    regulatory_impact: 1,
    project_news: 2,
    tokenized_gold_event: 3,
    rwa_news_insight: 4,
    market_change: 5
  };
  const detectedInsights = insights
    .sort((a, b) => (priority[a.type] || 99) - (priority[b.type] || 99))
    .slice(0, 3);
  const hasErrors = (narrative.diagnostics?.errors || []).length > 0;
  const hasCoreData = narrative.source === "alchemy" && narrative.diagnostics?.usedFallback !== true;
  const status = detectedInsights.length
    ? "insight_detected"
    : hasErrors
      ? "error"
      : hasCoreData
        ? "no_change"
        : "limited_data";
  const primarySource = detectedInsights
    .flatMap((insight) => insight.source || [])
    .find((source) => typeof source === "object" && source.url) || null;

  return {
    brief: {
      title: "Market Intelligence Brief",
      status,
      headline: detectedInsights.length
        ? `${detectedInsights.length}개의 확인할 만한 외부 신호가 감지되었습니다.`
        : "오늘 주목할 만한 외부 시장 변화는 확인되지 않았습니다.",
      summary: detectedInsights.length
        ? "대형 이동, 이전 기록 대비 변화, 검증된 공개 자료만 선별했습니다."
        : "금 토큰, 스테이블코인, RWA 관련 신호는 기존 관찰 범위와 유사합니다.",
      kgldImpact: detectedInsights.length
        ? "각 신호의 근거 링크를 확인한 뒤 운영 대응, 콘텐츠 반영, 단순 관찰 중 어디에 둘지 판단하세요."
        : "KGLD 운영 상태나 사업 방향에 즉시 반영할 외부 변화는 없습니다.",
      nextStep: detectedInsights.length
        ? "먼저 근거 링크를 열어 주소·기사 원문을 확인하고, 확인된 범위만 운영 노트나 콘텐츠 초안에 반영하세요."
        : "오늘은 외부 신호보다 상단 KGLD 운영 지표와 준비자산·상환 메시지를 우선 유지하세요.",
      watching: [
        "금 토큰 대형 이동",
        "신규 RWA 상품·공식 발표",
        "규제·수탁·상환 정책 변화",
        "KGLD/ITCEN/KorDA 관련 검증 뉴스"
      ],
      primarySource,
      detectedInsightCount: detectedInsights.length,
      lastGeneratedAt: narrative.generatedAt,
      confidence: hasCoreData ? "medium" : "low"
    },
    detectedInsights,
    candidates
  };
}

function buildContentOpportunities({ narrative, newsContext, newsHistory, contentHistory }) {
  const now = new Date();
  const usedUrls = new Set((newsHistory?.entries || []).map((entry) => entry.url).filter(Boolean));
  const verifiedNews = (newsContext?.items || [])
    .filter((item) => isVerifiedNewsItem(item, now))
    .filter((item) => !usedUrls.has(item.url))
    .filter((item, index, items) => items.findIndex((candidate) => candidate.url === item.url) === index)
    .slice(0, 3);
  const recentAngles = new Set((contentHistory?.entries || []).slice(-7).map((entry) => entry.selectedAngle));
  const todayKey = asKstString(now).slice(0, 10);
  const existingToday = (contentHistory?.entries || []).find((entry) => String(entry.usedAt || "").slice(0, 10) === todayKey);
  const anglePool = [
    "Project Progress",
    "Technology",
    "Gold/RWA Education",
    "Reserve Transparency",
    "Redemption UX",
    "Multichain",
    "Market Context",
    "Regulation",
    "ITCEN Group Strategy",
    "Product Vision",
    "Custody",
    "Onchain Operations"
  ];
  const selectedAngle = existingToday?.selectedAngle || anglePool.find((angle) => !recentAngles.has(angle)) || anglePool[0];
  const source = verifiedNews[0];
  const contentMode = source?.sourceType === "official"
    ? "official_update"
    : source
      ? "fresh_news"
      : "editorial";
  const editorialCopy = {
    "Project Progress": ["Build progress should be explained through what is verifiable, not what is merely expected.", "프로젝트 진행은 기대보다 확인 가능한 사실을 중심으로 설명하는 편이 신뢰를 만듭니다."],
    "Technology": ["Good infrastructure is quiet: it makes verification, custody, and redemption easier to understand.", "좋은 인프라는 화려한 표현보다 검증·보관·상환 구조를 더 쉽게 이해하게 만듭니다."],
    "Gold/RWA Education": ["Tokenized gold connects a familiar asset with a more transparent operational record.", "토큰화된 금은 익숙한 실물 자산과 더 투명한 운영 기록을 연결합니다."],
    "Reserve Transparency": ["For a gold-backed RWA, trust starts with reserves, custody, and a clear path to redemption.", "금 기반 RWA의 신뢰는 준비자산, 보관 구조, 명확한 상환 경로에서 시작합니다."],
    "Redemption UX": ["A tokenized asset is only as understandable as its redemption path.", "토큰화 자산의 이해 가능성은 상환 경로가 얼마나 명확한지에 달려 있습니다."]
  };
  const copy = editorialCopy[selectedAngle] || [
    "KGLD explores how real-world gold can be represented with clearer operational context.",
    "KGLD는 실물 금을 더 명확한 운영 맥락과 함께 온체인에서 설명하는 방식을 탐색합니다."
  ];
  const primarySource = source || {
    title: "No new verified source today",
    publisher: "Editorial",
    publishedAt: narrative.generatedAt,
    url: "",
    sourceType: "derived"
  };
  const oneLineInsight = source
    ? "검증된 신규 공개 자료를 바탕으로 오늘의 콘텐츠 초안을 구성했습니다."
    : "오늘 신규 KGLD/ITCEN 관련 기사는 확인되지 않았습니다.";

  return {
    title: "Content Opportunities",
    contentMode,
    freshness: source ? "fresh" : "none",
    selectedAngle,
    primaryAngle: selectedAngle,
    contentAngle: selectedAngle,
    primarySource,
    previouslyUsed: recentAngles.has(selectedAngle),
    oneLineInsight,
    whyToday: source
      ? "최근 72시간 내 확인된 공개 자료를 보수적으로 재구성했습니다."
      : `신규 검증 기사가 없어 최근 7일간 사용하지 않은 ${selectedAngle} 주제를 선택했습니다.`,
    usableFacts: source
      ? [source.title, source.publisher, source.publishedAt]
      : ["신규 검증 기사 없음", `Editorial angle: ${selectedAngle}`, `KGLD activity: ${narrative.observed?.kgldActivity || "unknown"}`],
    kgldMessage: copy[1],
    xPostEnglish: copy[0],
    xPostKorean: copy[1],
    internalNote: source
      ? "원문 범위를 벗어나 발행·상장·제휴 완료를 암시하지 마세요."
      : "Editorial Mode입니다. 신규 뉴스처럼 표현하지 말고 교육·설명형 콘텐츠로 사용하세요.",
    landingCopy: "KGLD connects real-world gold with a focus on verifiable reserves, redemption context, and operational transparency.",
    whyNow: source
      ? "검증 가능한 신규 자료가 있어 사실 기반 콘텐츠로 활용할 수 있습니다."
      : "새 소식을 만들지 않고, 기존에 확인 가능한 KGLD/RWA 구조를 교육형 주제로 설명할 수 있습니다.",
    relatedSources: verifiedNews,
    newsContext: {
      headline: source ? source.title : "오늘 신규 검증 뉴스 없음",
      keyMessage: source?.summary || "검색 링크와 watch item은 기사로 표시하지 않습니다.",
      relatedItems: []
    },
    onchainContext: {
      headline: "온체인 데이터는 콘텐츠의 보조 맥락으로만 사용합니다.",
      keyMessage: "샘플 수만으로 시장 활성도나 수요를 단정하지 않습니다."
    },
    complianceCaution: [
      "보도 내용은 '공개 자료에 따르면', '계획', '추진'처럼 보수적으로 표현하세요.",
      "미확인 상장, 거래소, 파트너십, 가격 상승 또는 수익률을 암시하지 마세요."
    ],
    doNotSay: [
      "상장 완료 또는 거래 가능",
      "시장 선도 또는 거래량 우위",
      "확정 수익 또는 가격 상승",
      "무조건 상환 보장"
    ]
  };
}

async function readJsonFile(filePath, fallbackValue) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallbackValue;
  }
}

function normalizeHistory(value) {
  if (Array.isArray(value)) return { snapshots: value };
  if (value && Array.isArray(value.snapshots)) return value;
  return { snapshots: [] };
}

function stablecoinSnapshot(rwaSectorPulse, symbol) {
  const stablecoins = rwaSectorPulse?.signals?.stablecoins || {};
  const key = `${symbol.toLowerCase()}TransferCount`;
  return {
    status: stablecoins.status || "unknown",
    transferCount: Number(stablecoins[key] || 0)
  };
}

function buildHistorySnapshot(narrative) {
  const radarTokens = narrative.tokenizedGoldRadar?.tokens || {};
  const rwaSignals = narrative.rwaSectorPulse?.signals || {};

  return {
    generatedAt: narrative.generatedAt || asKstString(new Date()),
    source: narrative.source || "unknown",
    signals: {
      KGLD: radarTokens.KGLD || unknownTokenState(),
      PAXG: radarTokens.PAXG || unknownTokenState(),
      XAUT: radarTokens.XAUT || unknownTokenState(),
      USDC: stablecoinSnapshot(narrative.rwaSectorPulse, "USDC"),
      USDT: stablecoinSnapshot(narrative.rwaSectorPulse, "USDT"),
      gas: {
        status: rwaSignals.gas?.status || narrative.marketWeather?.gasWeather || "unknown"
      }
    },
    summary: {
      marketWeather: narrative.marketWeather?.todayPositioning || "",
      tokenizedGoldMood: narrative.tokenizedGoldRadar?.marketMood || "unknown",
      rwaSectorMood: narrative.rwaSectorPulse?.sectorMood || "unknown",
      contentAngle: narrative.contentIdea?.contentAngle || ""
    }
  };
}

function snapshotDateKey(snapshot) {
  return String(snapshot.generatedAt || "").slice(0, 10) || "unknown";
}

function shouldAppendHistory(narrative) {
  return narrative.source === "alchemy" && narrative.diagnostics?.usedFallback !== true;
}

function updateHistorySnapshots(history, narrative) {
  const normalized = normalizeHistory(history);
  if (!shouldAppendHistory(narrative)) {
    return normalized.snapshots.slice(-30);
  }

  const snapshot = buildHistorySnapshot(narrative);
  const snapshotKey = snapshotDateKey(snapshot);
  const withoutDuplicate = normalized.snapshots.filter((item) => snapshotDateKey(item) !== snapshotKey);
  return [...withoutDuplicate, snapshot].slice(-30);
}

function isObservedStatus(value) {
  return ["observed", "sample_full", "notable", "active", "volatile"].includes(value);
}

function countRecent(snapshots, predicate) {
  return snapshots.reduce((count, snapshot) => count + (predicate(snapshot) ? 1 : 0), 0);
}

function kgldQuietStreak(snapshots) {
  let streak = 0;
  for (let index = snapshots.length - 1; index >= 0; index -= 1) {
    if (snapshots[index]?.signals?.KGLD?.activity === "quiet") {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

function buildNarrativeTrend(history) {
  const recent = normalizeHistory(history).snapshots.slice(-7);

  if (recent.length < 3) {
    return {
      title: "7-Day Narrative Trend",
      headline: "7일 추세 판단을 위한 데이터가 아직 충분하지 않습니다.",
      kgldQuietStreak: kgldQuietStreak(recent),
      goldTokenObservedDays: countRecent(recent, (snapshot) => isObservedStatus(snapshot.signals?.PAXG?.activity) || isObservedStatus(snapshot.signals?.XAUT?.activity)),
      stablecoinObservedDays: countRecent(recent, (snapshot) => isObservedStatus(snapshot.signals?.USDC?.status) || isObservedStatus(snapshot.signals?.USDT?.status)),
      gasLowDays: countRecent(recent, (snapshot) => snapshot.signals?.gas?.status === "low"),
      notableLargeTransferDays: countRecent(recent, (snapshot) => Boolean(snapshot.signals?.KGLD?.largeTransferDetected || snapshot.signals?.PAXG?.largeTransferDetected || snapshot.signals?.XAUT?.largeTransferDetected)),
      trendMood: "unknown",
      kgldImplication: "추세 데이터 축적 중입니다. 단일 스냅샷보다 며칠간의 반복 신호가 쌓인 뒤 판단합니다.",
      confidence: "low"
    };
  }

  const quietStreak = kgldQuietStreak(recent);
  const goldObserved = countRecent(recent, (snapshot) => isObservedStatus(snapshot.signals?.PAXG?.activity) || isObservedStatus(snapshot.signals?.XAUT?.activity));
  const stablecoinObserved = countRecent(recent, (snapshot) => isObservedStatus(snapshot.signals?.USDC?.status) || isObservedStatus(snapshot.signals?.USDT?.status));
  const gasLow = countRecent(recent, (snapshot) => snapshot.signals?.gas?.status === "low");
  const notableDays = countRecent(recent, (snapshot) => Boolean(snapshot.signals?.KGLD?.largeTransferDetected || snapshot.signals?.PAXG?.largeTransferDetected || snapshot.signals?.XAUT?.largeTransferDetected));

  const headlineParts = [];
  if (quietStreak >= 3) {
    headlineParts.push("KGLD는 최근 며칠간 조용한 온체인 상태를 유지하고 있습니다.");
  }
  if (goldObserved >= 3) {
    headlineParts.push("금 기반 토큰 카테고리의 전송 샘플은 꾸준히 관찰됩니다.");
  }
  if (gasLow >= 3) {
    headlineParts.push("온체인 실행 비용은 비교적 안정적인 구간입니다.");
  }

  let trendMood = "mixed";
  if (notableDays > 0) {
    trendMood = "active";
  } else if (quietStreak >= 3 && goldObserved < 3 && stablecoinObserved < 3) {
    trendMood = "quiet";
  } else if (goldObserved >= 3 || stablecoinObserved >= 3) {
    trendMood = "building";
  }

  return {
    title: "7-Day Narrative Trend",
    headline: headlineParts.length ? headlineParts.join(" ") : "최근 7개 스냅샷은 혼합된 신호를 보여주며, 단정적 해석은 아직 이릅니다.",
    kgldQuietStreak: quietStreak,
    goldTokenObservedDays: goldObserved,
    stablecoinObservedDays: stablecoinObserved,
    gasLowDays: gasLow,
    notableLargeTransferDays: notableDays,
    trendMood,
    kgldImplication: quietStreak >= 3
      ? "거래 활성도보다 준비자산·상환·운영 투명성 메시지를 유지하기 좋은 구간입니다."
      : "단일 전송 샘플보다 반복되는 준비자산·상환·운영 투명성 메시지의 일관성이 중요합니다.",
    confidence: recent.length >= 7 ? "high" : "medium"
  };
}

function buildNarrativeTrendStrict(history) {
  const recent = normalizeHistory(history).snapshots.slice(-7);
  const quietStreak = kgldQuietStreak(recent);
  const goldObserved = countRecent(recent, (snapshot) => isObservedStatus(snapshot.signals?.PAXG?.activity) || isObservedStatus(snapshot.signals?.XAUT?.activity));
  const stablecoinObserved = countRecent(recent, (snapshot) => isObservedStatus(snapshot.signals?.USDC?.status) || isObservedStatus(snapshot.signals?.USDT?.status));
  const gasLow = countRecent(recent, (snapshot) => snapshot.signals?.gas?.status === "low");
  const notableDays = countRecent(recent, (snapshot) => Boolean(snapshot.signals?.KGLD?.largeTransferDetected || snapshot.signals?.PAXG?.largeTransferDetected || snapshot.signals?.XAUT?.largeTransferDetected));

  if (recent.length < 3) {
    return {
      title: "7-Day Narrative Trend",
      headline: "7일 추세 판단을 위한 데이터가 아직 축적 중입니다.",
      kgldQuietStreak: quietStreak,
      goldTokenObservedDays: goldObserved,
      stablecoinObservedDays: stablecoinObserved,
      gasLowDays: gasLow,
      notableLargeTransferDays: notableDays,
      trendMood: "unknown",
      kgldImplication: "추세 데이터 축적 중입니다. 단일 스냅샷보다 며칠간의 반복 신호가 쌓인 뒤 판단합니다.",
      confidence: "low"
    };
  }

  const headlineParts = [];
  if (quietStreak >= 3) {
    headlineParts.push("KGLD는 최근 며칠간 조용한 온체인 상태를 유지하고 있습니다.");
  }
  if (goldObserved >= 3) {
    headlineParts.push("금 기반 토큰 카테고리의 전송 샘플은 꾸준히 관찰됩니다.");
  }
  if (notableDays >= 1) {
    headlineParts.push("일부 대형 이동 관찰일이 포함되어 있습니다.");
  }

  let trendMood = "mixed";
  if (notableDays >= 1) {
    trendMood = "mixed";
  } else if (quietStreak >= 3) {
    trendMood = "quiet";
  } else if (goldObserved >= 3 || stablecoinObserved >= 3) {
    trendMood = "building";
  }

  const implicationParts = [
    quietStreak >= 3
      ? "거래 활성도보다 준비자산·상환·운영 투명성 메시지를 유지하기 좋은 구간입니다."
      : "단일 전송 샘플보다 반복되는 준비자산·상환·운영 투명성 메시지의 일관성이 중요합니다."
  ];
  if (gasLow >= 3) {
    implicationParts.push("온체인 실행 비용이 비교적 안정적인 구간입니다.");
  }

  return {
    title: "7-Day Narrative Trend",
    headline: headlineParts.length ? headlineParts.join(" ") : "최근 7개 스냅샷은 혼합된 신호를 보여주며, 단정적 해석은 아직 이릅니다.",
    kgldQuietStreak: quietStreak,
    goldTokenObservedDays: goldObserved,
    stablecoinObservedDays: stablecoinObserved,
    gasLowDays: gasLow,
    notableLargeTransferDays: notableDays,
    trendMood,
    kgldImplication: implicationParts.join(" "),
    confidence: recent.length >= 7 ? "high" : "medium"
  };
}

async function updateNarrativeHistory(narrative) {
  try {
    const currentHistory = normalizeHistory(await readJsonFile(ROOT_HISTORY_PATH, { snapshots: [] }));
    const snapshots = updateHistorySnapshots(currentHistory, narrative);
    const history = {
      updatedAt: asKstString(new Date()),
      snapshots
    };
    await writeNarrativeHistory(history);
    return history;
  } catch (error) {
    console.warn(`[narrative] History update skipped: ${error.message}`);
    return normalizeHistory(await readJsonFile(ROOT_HISTORY_PATH, { snapshots: [] }));
  }
}

async function fetchTokenTransfers({ address, fromBlock, tokenName, diagnostics }) {
  try {
    logStep(`Fetching ${tokenName} transfers with maxCount ${TOKEN_TRANSFER_LIMIT_HEX}.`);
    const result = await rpc("alchemy_getAssetTransfers", [{
      fromBlock: `0x${fromBlock.toString(16)}`,
      toBlock: "latest",
      category: ["erc20"],
      contractAddresses: [address],
      withMetadata: true,
      excludeZeroValue: false,
      maxCount: TOKEN_TRANSFER_LIMIT_HEX,
      order: "desc"
    }], diagnostics);
    diagnostics.rpcChecks[tokenName] = "ok";
    logStep(`${tokenName} transfers ok: ${(result.transfers || []).length}`);
    return result.transfers || [];
  } catch (error) {
    diagnostics.rpcChecks[tokenName] = "failed";
    addDiagnosticError(diagnostics, `${tokenName}: ${error.message}`);
    console.warn(`[narrative] ${tokenName} transfer lookup failed: ${error.message}`);
    return null;
  }
}

async function fetchMinimalNarrativeInputs(diagnostics) {
  logStep(`Alchemy endpoint present: ${diagnostics.hasAlchemyUrl}`);
  logStep("Fetching gas price and latest block.");
  const [gasHex, latestBlockHex] = await Promise.all([
    rpc("eth_gasPrice", [], diagnostics).then((result) => {
      diagnostics.rpcChecks.gasPrice = "ok";
      logStep("eth_gasPrice ok.");
      return result;
    }).catch((error) => {
      diagnostics.rpcChecks.gasPrice = "failed";
      addDiagnosticError(diagnostics, `gasPrice: ${error.message}`);
      throw error;
    }),
    rpc("eth_blockNumber", [], diagnostics).then((result) => {
      diagnostics.rpcChecks.blockNumber = "ok";
      logStep("eth_blockNumber ok.");
      return result;
    }).catch((error) => {
      diagnostics.rpcChecks.blockNumber = "failed";
      addDiagnosticError(diagnostics, `blockNumber: ${error.message}`);
      throw error;
    })
  ]);
  const latestBlock = BigInt(latestBlockHex);
  const fromBlock = latestBlock > 7200n ? latestBlock - 7200n : 0n;
  logStep(`Using block range ${fromBlock.toString()} -> ${latestBlock.toString()}.`);
  const tokenTransferEntries = await Promise.all(Object.entries(TOKENIZED_GOLD_TOKENS).map(async ([tokenName, address]) => {
    const transfers = await fetchTokenTransfers({ address, fromBlock, tokenName, diagnostics });
    return [tokenName, transfers];
  }));
  const stablecoinTransferEntries = await Promise.all(Object.entries(STABLECOIN_TOKENS).map(async ([tokenName, address]) => {
    const transfers = await fetchTokenTransfers({ address, fromBlock, tokenName, diagnostics });
    return [tokenName, transfers];
  }));
  const tokenTransfers = Object.fromEntries(tokenTransferEntries);
  const stablecoinTransfers = Object.fromEntries(stablecoinTransferEntries);
  const tokenStates = Object.fromEntries(Object.entries(tokenTransfers).map(([tokenName, transfers]) => [
    tokenName,
    transfers ? classifyTokenTransfersConservative(transfers) : unknownTokenState()
  ]));
  const stablecoinStates = Object.fromEntries(Object.entries(stablecoinTransfers).map(([tokenName, transfers]) => [
    tokenName,
    classifyStablecoinTransfersConservative(transfers)
  ]));
  const tokenizedGoldRadar = buildTokenizedGoldRadarConservative(tokenStates);

  return {
    gasWeather: classifyGas(BigInt(gasHex)),
    transfers: tokenTransfers.KGLD || [],
    tokenizedGoldRadar,
    rwaSectorPulse: buildRwaSectorPulseConservative({
      tokenizedGoldRadar,
      stablecoinStates,
      gasWeather: classifyGas(BigInt(gasHex))
    }),
    diagnostics
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

async function writeNarrativeHistory(data) {
  const serialized = `${JSON.stringify(data, null, 2)}\n`;
  await fs.mkdir(path.dirname(ROOT_HISTORY_PATH), { recursive: true });
  await fs.mkdir(path.dirname(DASHBOARD_HISTORY_PATH), { recursive: true });
  await Promise.all([
    fs.writeFile(ROOT_HISTORY_PATH, serialized, "utf8"),
    fs.writeFile(DASHBOARD_HISTORY_PATH, serialized, "utf8")
  ]);
  await Promise.all([
    fs.readFile(ROOT_HISTORY_PATH, "utf8").then(JSON.parse),
    fs.readFile(DASHBOARD_HISTORY_PATH, "utf8").then(JSON.parse)
  ]);
}

async function writeMirroredJson(rootPath, dashboardPath, data) {
  const serialized = `${JSON.stringify(data, null, 2)}\n`;
  await fs.mkdir(path.dirname(rootPath), { recursive: true });
  await fs.mkdir(path.dirname(dashboardPath), { recursive: true });
  await Promise.all([
    fs.writeFile(rootPath, serialized, "utf8"),
    fs.writeFile(dashboardPath, serialized, "utf8")
  ]);
}

async function updateContentHistories(contentIdea) {
  const contentHistory = await readJsonFile(ROOT_CONTENT_HISTORY_PATH, { updatedAt: "unknown", entries: [] });
  const newsHistory = await readJsonFile(ROOT_NEWS_HISTORY_PATH, { updatedAt: "unknown", entries: [] });
  const dateKey = String(asKstString(new Date())).slice(0, 10);
  const contentEntry = {
    usedAt: asKstString(new Date()),
    selectedAngle: contentIdea.selectedAngle || contentIdea.primaryAngle || "unknown",
    contentMode: contentIdea.contentMode || "fallback",
    sourceUrl: contentIdea.primarySource?.url || "",
    sourceTitle: contentIdea.primarySource?.title || "",
    normalizedText: normalizeText(contentIdea.xPostEnglish),
    normalizedContentHash: simpleHash(`${contentIdea.selectedAngle}|${normalizeText(contentIdea.xPostEnglish)}`)
  };
  const contentEntries = [
    ...(contentHistory.entries || []).filter((item) => String(item.usedAt || "").slice(0, 10) !== dateKey),
    contentEntry
  ].slice(-60);

  const newsEntries = [...(newsHistory.entries || [])];
  if (contentIdea.primarySource?.url && ["fresh_news", "official_update"].includes(contentIdea.contentMode)) {
    newsEntries.push({
      usedAt: contentEntry.usedAt,
      title: contentIdea.primarySource.title,
      url: contentIdea.primarySource.url
    });
  }

  await Promise.all([
    writeMirroredJson(ROOT_CONTENT_HISTORY_PATH, DASHBOARD_CONTENT_HISTORY_PATH, {
      updatedAt: contentEntry.usedAt,
      entries: contentEntries
    }),
    writeMirroredJson(ROOT_NEWS_HISTORY_PATH, DASHBOARD_NEWS_HISTORY_PATH, {
      updatedAt: contentEntry.usedAt,
      entries: newsEntries.slice(-60)
    })
  ]);
}

async function main() {
  let narrative;
  const diagnostics = createDiagnostics();
  logStep("Starting narrative cache update.");
  try {
    const inputs = await fetchMinimalNarrativeInputs(diagnostics);
    narrative = buildNarrativeConservative(inputs);
  } catch (error) {
    addDiagnosticError(diagnostics, error.message);
    console.warn(`[narrative] Narrative update fallback: ${error.message}`);
    narrative = fallbackNarrative("시장 내러티브 데이터 수집 대기 중", diagnostics);
  }
  const history = await updateNarrativeHistory(narrative);
  const newsContext = await readNewsContext();
  const contentHistory = await readJsonFile(ROOT_CONTENT_HISTORY_PATH, { updatedAt: "unknown", entries: [] });
  const newsHistory = await readJsonFile(ROOT_NEWS_HISTORY_PATH, { updatedAt: "unknown", entries: [] });
  narrative.narrativeTrend = buildNarrativeTrendStrict(history);
  narrative = buildIntelligenceModels(narrative, history);
  const intelligence = buildMarketIntelligenceEnhanced({
    narrative,
    history,
    newsContext,
    newsHistory
  });
  narrative.marketIntelligenceBrief = intelligence.brief;
  narrative.detectedInsights = intelligence.detectedInsights;
  narrative.diagnostics.meaningfulCandidates = intelligence.candidates;
  narrative.contentIdea = buildContentOpportunities({
    narrative,
    newsContext,
    newsHistory,
    contentHistory
  });
  narrative.todayActionBrief = buildTodayActionBrief(narrative);
  await updateContentHistories(narrative.contentIdea);
  await writeNarrativeCache(narrative);
  console.log(`[narrative] Updated narrative cache: ${narrative.source} at ${narrative.generatedAt}`);
  console.log(`[narrative] Updated narrative history snapshots: ${history.snapshots.length}`);
  console.log(`[narrative] Diagnostics: ${JSON.stringify(narrative.diagnostics)}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
