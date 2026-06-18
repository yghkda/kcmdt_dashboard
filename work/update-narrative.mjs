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
      title: "KGLD Content Idea",
      contentAngle: "Real asset trust onchain",
      oneLineInsight: "시장 내러티브 데이터 수집 대기 중입니다.",
      tweetDraftEnglish: "Narrative data is pending. Onchain dashboard metrics remain available.",
      tweetDraftKorean: "시장 내러티브 데이터는 수집 대기 중이며, 상단 온체인 지표는 정상 표시됩니다.",
      whyNow: "다음 narrative cache 갱신 후 콘텐츠 아이디어가 표시됩니다.",
      doNotSay: [
        "KGLD is widely traded",
        "KGLD is listed on a specific exchange unless confirmed",
        "Guaranteed gold redemption without policy conditions",
        "Investment return or price appreciation"
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
  const kgldQuiet = tokens.KGLD?.activity === "quiet";

  let headline = "금 기반 토큰 전송 샘플이 제한적으로 관찰됩니다.";
  let kgldAngle = "KGLD는 거래 활성도 경쟁보다 실물 기반 신뢰와 상환 가능성을 차분히 설명하는 접근이 적합합니다.";
  let operatorAction = "시장 활성도를 단정하지 말고, 금 기반 토큰 카테고리의 관찰 신호로만 참고하세요.";
  let confidence = marketMood === "unknown" ? "low" : "medium";

  if (kgldQuiet && externalSampleNames.length) {
    headline = "PAXG와 XAUT의 최근 전송 샘플이 확인되었고, KGLD는 조용한 상태입니다.";
    kgldAngle = "KGLD는 외부 금 토큰 활동을 단순 추종하기보다, 실물 기반 신뢰와 상환 가능성을 차분히 설명하는 접근이 적합합니다.";
  } else if (marketMood === "notable" || marketMood === "volatile") {
    headline = "일부 금 기반 토큰에서 대형 이동 기준에 해당하는 샘플이 확인됩니다.";
    kgldAngle = "KGLD는 대형 이동의 의도를 단정하지 않고, 실물 기반 신뢰와 상환 가능성 중심의 안정적인 메시지를 유지하는 편이 적합합니다.";
  } else if (marketMood === "unknown") {
    headline = "금 토큰 비교 데이터를 충분히 확인하지 못했습니다.";
    kgldAngle = "KGLD는 부족한 외부 데이터를 추정하지 않고 기본 신뢰 메시지를 유지합니다.";
    operatorAction = "PAXG/XAUT 조회 상태를 확인하고, 데이터가 충분해진 뒤 비교 내러티브를 사용하세요.";
  } else if (marketMood === "quiet") {
    headline = "금 기반 토큰 전송 샘플은 전반적으로 조용하게 관찰됩니다.";
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
  let confidence = "low";

  if ((["observed", "sample_full", "notable"].includes(goldStatus)) &&
      (["observed", "sample_full", "notable"].includes(stablecoinStatus))) {
    headline = "금 기반 토큰과 스테이블코인 전송 샘플은 확인되었지만, RWA 섹터 전체 판단에는 추가 데이터가 필요합니다.";
    kgldPositioning = "KGLD는 섹터 과열 신호보다 준비자산·상환 UX·운영 투명성 중심 메시지가 적합합니다.";
    confidence = "medium";
  } else if (goldStatus === "notable" || stablecoinStatus === "notable") {
    headline = "일부 자산에서 대형 이동 기준에 해당하는 샘플이 확인되지만, RWA 섹터 전체 방향성은 단정하지 않습니다.";
    kgldPositioning = "KGLD는 특정 지갑 의도를 추정하기보다 준비자산·상환 가능성·운영 추적성을 강조하는 편이 적합합니다.";
    confidence = "medium";
  }

  return {
    title: "RWA Sector Pulse",
    sectorMood: "limited_data",
    headline,
    kgldPositioning,
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

function buildNarrativeConservative({ gasWeather, transfers, tokenizedGoldRadar, rwaSectorPulse, diagnostics }) {
  const activity = classifyKgldActivity(transfers);
  const generatedAt = asKstString(new Date());
  const goldTokenWeather = tokenizedGoldRadar.marketMood || "unknown";
  const stablecoinWeather = rwaSectorPulse.signals?.stablecoins?.status || "unknown";
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
      todayPositioning: "오늘은 KGLD가 거래량보다 실물 기반 신뢰와 상환 가능성을 강조하기 좋은 구간입니다.",
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
  await writeNarrativeCache(narrative);
  console.log(`[narrative] Updated narrative cache: ${narrative.source} at ${narrative.generatedAt}`);
  console.log(`[narrative] Diagnostics: ${JSON.stringify(narrative.diagnostics)}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
