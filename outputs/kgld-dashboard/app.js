const data = window.KGLD_DASHBOARD_DATA;
const appBaseUrl = new URL(".", document.currentScript?.src || window.location.href);

const shortAddress = (address) => `${address.slice(0, 6)}...${address.slice(-4)}`;
const etherscan = (type, value) => `https://etherscan.io/${type}/${value}`;
const formatToken = (value) => Number(value).toLocaleString("ko-KR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 8
});

const splitStatusMessage = (message) => {
  const normalized = String(message || "").replace(/\s+/g, " ").trim();
  const inferenceMarkers = ["추정:", "운영 판단:"];
  const marker = inferenceMarkers.find((item) => normalized.includes(item));

  if (!marker) {
    return {
      observed: normalized || "최근 온체인 데이터를 기준으로 상태를 집계했습니다.",
      inference: "추가 이상 징후는 위험 모니터와 Today's Action Brief에서 확인하세요."
    };
  }

  const [observed, inference] = normalized.split(marker);
  return {
    observed: observed.replace(/^관찰 사실:\s*/, "").trim(),
    inference: inference.trim()
  };
};

const getKpi = (label) => data.kpis.find((item) => item.label === label);
const fallbackNarrative = {
  generatedAt: "unknown",
  source: "fallback",
  status: "unknown",
  diagnostics: {
    generatedBy: "dashboard-fallback",
    hasAlchemyUrl: false,
    usedFallback: true,
    errors: ["Narrative cache could not be loaded"],
    rpcChecks: {}
  },
  marketWeather: {
    title: "Market Weather for KGLD",
    stablecoinWeather: "unknown",
    goldTokenWeather: "unknown",
    rwaWeather: "unknown",
    gasWeather: "unknown",
    todayPositioning: "데이터를 불러오지 못했습니다.",
    contentAngle: "MCP 데이터 연결 후 업데이트가 필요합니다.",
    confidence: "low"
  },
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
  contentIdea: {
    title: "KGLD Content Desk",
    contentMode: "fallback",
    primaryAngle: "insufficient_data",
    contentAngle: "insufficient_data",
    oneLineInsight: "데이터가 부족하면 추정하지 않고 unknown 상태로 유지합니다.",
    newsContext: {
      headline: "뉴스 컨텍스트가 아직 준비되지 않았습니다.",
      keyMessage: "온체인 데이터만 기준으로 콘텐츠를 제안합니다.",
      relatedItems: []
    },
    onchainContext: {
      headline: "온체인 컨텍스트가 아직 준비되지 않았습니다.",
      keyMessage: "narrative cache 갱신 후 표시됩니다."
    },
    xPostEnglish: "Narrative data is not available yet.",
    xPostKorean: "내러티브 데이터가 아직 준비되지 않았습니다.",
    internalNote: "narrative cache가 준비된 뒤 내부 검토용 콘텐츠 메모가 표시됩니다.",
    landingCopy: "KGLD brings real-world value onchain with a focus on verification and operational transparency.",
    whyNow: "캐시 데이터를 불러오지 못했습니다.",
    complianceCaution: [
      "확인되지 않은 상장, 파트너십, 거래소명은 사용하지 마세요.",
      "상환 관련 표현은 정책과 조건 범위 안에서만 사용하세요."
    ],
    doNotSay: ["미확인 상장, 파트너십, 거래소 협력 언급", "시장 리더 또는 기관 채택 단정", "준비자산 검증 없는 과장 표현"]
  },
  tokenizedGoldRadar: {
    title: "Tokenized Gold Radar",
    headline: "금 토큰 시장 데이터를 불러오지 못했습니다.",
    marketMood: "unknown",
    kgldAngle: "KGLD는 확인되지 않은 외부 시장 분위기를 추정하지 않고, 준비자산·상환 가능성·실물 기반 신뢰 메시지를 유지합니다.",
    observations: ["KGLD/PAXG/XAUT 비교 데이터가 아직 준비되지 않았습니다."],
    operatorAction: "캐시 갱신 상태를 확인하세요.",
    confidence: "low",
    tokens: {
      KGLD: { activity: "unknown", transferCount: 0, largeTransferDetected: false },
      PAXG: { activity: "unknown", transferCount: 0, largeTransferDetected: false },
      XAUT: { activity: "unknown", transferCount: 0, largeTransferDetected: false }
    }
  },
  rwaSectorPulse: {
    title: "RWA Sector Pulse",
    sectorMood: "limited_data",
    headline: "RWA 섹터 판단을 위한 데이터가 아직 제한적입니다.",
    kgldPositioning: "현재는 KGLD의 준비자산, 상환 UX, 운영 투명성 중심 메시지가 적절합니다.",
    decisionGuide: "섹터 방향을 단정하지 말고, KGLD 자체의 준비자산 확인 가능성·상환 절차·운영 추적성만 판단 근거로 사용하세요.",
    evidence: ["tokenized gold, stablecoin, gas 일부 신호만 우선 관찰합니다."],
    contentIdea: "RWA transparency over hype",
    confidence: "low",
    signals: {
      tokenizedGold: { status: "unknown", source: "tokenizedGoldRadar" },
      stablecoins: { status: "unknown", usdcTransferCount: 0, usdtTransferCount: 0 },
      gas: { status: "unknown" },
      rwaProtocols: { status: "limited_data", note: "Dune/The Graph 또는 protocol-specific 데이터 연결 전입니다." }
    }
  },
  narrativeTrend: {
    title: "7-Day Narrative Trend",
    headline: "추세 데이터 축적 중",
    kgldQuietStreak: 0,
    goldTokenObservedDays: 0,
    stablecoinObservedDays: 0,
    gasLowDays: 0,
    notableLargeTransferDays: 0,
    trendMood: "unknown",
    kgldImplication: "7일 추세 판단을 위한 history snapshot이 아직 충분하지 않습니다.",
    confidence: "low"
  }
};
const totalSupply = getKpi("총공급량") || data.kpis[0];
const transferCount = getKpi("24시간 전송") || data.kpis[1];
const minted = getKpi("발행") || data.kpis[3];
const burned = getKpi("소각") || data.kpis[4];
const issueShare = getKpi("Issue 보관 비중") || data.kpis[5];
const statusCopy = splitStatusMessage(data.statusMessage);
const circulatingValue = data.balances.circulating.value;

document.getElementById("updated-at").textContent = `업데이트 ${data.updatedAt}`;
document.getElementById("period-label").textContent = data.period;
document.getElementById("block-label").textContent = `Block ${data.latestBlock.toLocaleString("ko-KR")}`;
document.getElementById("status-badge").textContent = data.status;
document.getElementById("status-badge").classList.add(data.statusLevel);
document.getElementById("observed-message").textContent = statusCopy.observed;
document.getElementById("inference-message").textContent = statusCopy.inference;
document.getElementById("hero-supply").textContent = `${totalSupply.value} KGLD`;
document.getElementById("hero-issue-balance").textContent = `${formatToken(data.balances.issue.value)} KGLD`;
document.getElementById("hero-redeem-balance").textContent = `${formatToken(data.balances.redeem.value)} KGLD`;
document.getElementById("supply-meter-fill").style.width = `${Math.min(100, data.balances.issue.percentage)}%`;
document.getElementById("donut-total").textContent = totalSupply.value;

const issuePct = data.balances.issue.percentage;
const redeemPct = data.balances.redeem.percentage;
const redeemEndPct = issuePct + redeemPct;
document.getElementById("donut").style.background = `conic-gradient(
  var(--gold) 0 ${issuePct}%,
  var(--mint) ${issuePct}% ${redeemEndPct}%,
  var(--slate) ${redeemEndPct}% 100%
)`;

document.getElementById("hero-brief").innerHTML = [
  ["24h 전송", `${transferCount.value}${transferCount.unit}`],
  ["발행 / 소각", `${minted.value} / ${burned.value} KGLD`],
  ["Issue 보관", `${issueShare.value}${issueShare.unit}`],
  ["유통 추정", `${formatToken(circulatingValue)} KGLD`]
].map(([label, value]) => `
  <div class="brief-chip">
    <span>${label}</span>
    <strong>${value}</strong>
  </div>
`).join("");

document.querySelectorAll("[data-scroll-target]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.getElementById(button.dataset.scrollTarget);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

const copyButton = document.getElementById("copy-summary");
copyButton.addEventListener("click", async () => {
  const summary = [
    `KGLD ${data.period} 온체인 요약`,
    `상태: ${data.status}`,
    `총공급량: ${totalSupply.value} ${totalSupply.unit}`,
    `24시간 전송: ${transferCount.value}${transferCount.unit}`,
    `발행/소각: ${minted.value}/${burned.value} KGLD`,
    `Issue 보관: ${formatToken(data.balances.issue.value)} KGLD (${issueShare.value}${issueShare.unit})`,
    `Redeem 잔액: ${formatToken(data.balances.redeem.value)} KGLD`,
    `업데이트: ${data.updatedAt}`
  ].join("\n");

  try {
    await navigator.clipboard.writeText(summary);
    copyButton.textContent = "복사 완료";
    copyButton.classList.add("copied");
  } catch {
    copyButton.textContent = "복사 실패";
  }

  window.setTimeout(() => {
    copyButton.textContent = "요약 복사";
    copyButton.classList.remove("copied");
  }, 1600);
});

[
  ["token-link", "token", data.contracts.token],
  ["issue-link", "address", data.contracts.issue],
  ["redeem-link", "address", data.contracts.redeem]
].forEach(([id, type, address]) => {
  const link = document.getElementById(id);
  link.href = etherscan(type, address);
  link.textContent += ` ${shortAddress(address)} ↗`;
});

const kpiDisplay = [
  getKpi("24시간 거래량"),
  getKpi("발행"),
  getKpi("소각"),
  { label: "Redeem 잔액", value: formatToken(data.balances.redeem.value), unit: "KGLD", change: "0", tone: data.balances.redeem.value > 0 ? "watch" : "neutral" },
  { label: "기타 유통", value: formatToken(circulatingValue), unit: "KGLD", change: "0", tone: circulatingValue > 0 ? "watch" : "neutral" },
  issueShare
].filter(Boolean);

document.getElementById("kpi-grid").innerHTML = kpiDisplay.map((kpi, index) => `
  <article class="kpi-card ${kpi.tone} ${index === 0 ? "primary" : ""}">
    <div class="kpi-label">${kpi.label}</div>
    <div class="kpi-value">${kpi.value}<span class="kpi-unit">${kpi.unit}</span></div>
    <div class="kpi-change">${kpi.change === "0" ? "- 변동 없음" : kpi.change}</div>
  </article>
`).join("");

const balanceConfig = [
  ["Issue Contract · 발행 자산 보관", data.balances.issue, "var(--gold)"],
  ["Redeem Contract", data.balances.redeem, "var(--mint)"],
  ["기타 유통", data.balances.circulating, "#345048"]
];

document.getElementById("balance-list").innerHTML = balanceConfig.map(([name, item, color]) => `
  <div class="balance-row">
    <span class="color-key" style="background:${color}"></span>
    <span class="balance-name">${name}</span>
    <span class="balance-value">${formatToken(item.value)} KGLD<span>${item.percentage.toFixed(2)}% · 변동 없음</span></span>
  </div>
`).join("");

const donut = document.getElementById("donut");
const donutTooltip = document.getElementById("donut-tooltip");
const donutSegments = [
  ["Issue 보관", data.balances.issue, "발행 자산 보관 및 배포 대기 물량"],
  ["Redeem 잔액", data.balances.redeem, "상환 관련 컨트랙트 잔액"],
  ["기타 유통", data.balances.circulating, "Issue/Redeem 외 주소 보유량"]
];

donut.addEventListener("mousemove", (event) => {
  const rect = donut.getBoundingClientRect();
  const x = event.clientX - rect.left - rect.width / 2;
  const y = event.clientY - rect.top - rect.height / 2;
  const angle = (Math.atan2(y, x) * 180 / Math.PI + 450) % 360;
  const pct = angle / 360 * 100;
  const segment = pct <= issuePct
    ? donutSegments[0]
    : pct <= redeemEndPct
      ? donutSegments[1]
      : donutSegments[2];
  const [label, item, note] = segment;
  donutTooltip.innerHTML = `<strong>${label} · ${item.percentage.toFixed(2)}%</strong><span>${formatToken(item.value)} KGLD · ${note}</span>`;
  donutTooltip.classList.add("visible");
});

donut.addEventListener("mouseleave", () => {
  donutTooltip.classList.remove("visible");
});

const activityConfig = [
  ["Issue · 발행 자산 보관", data.activity.issue],
  ["Redeem", data.activity.redeem]
];

document.getElementById("activity-list").innerHTML = activityConfig.map(([name, item]) => `
  <div class="activity-row">
    <div>
      <div class="activity-name">${name}</div>
      <div class="activity-meta">유입 ${formatToken(item.inbound)} · 유출 ${formatToken(item.outbound)} KGLD</div>
    </div>
    <span class="activity-state">${item.note}</span>
  </div>
`).join("");

document.getElementById("risk-list").innerHTML = data.risks.map((risk) => `
  <div class="risk-row">
    <span class="risk-level ${risk.level.toLowerCase()}">${risk.level}</span>
    <div>
      <div class="risk-title">${risk.title}</div>
      <div class="risk-detail">${risk.detail}</div>
    </div>
  </div>
`).join("");

const actionList = document.getElementById("action-list");
if (actionList) {
  actionList.innerHTML = data.actions.map((action) => `
    <div class="action-row">
      <span class="priority">${action.priority}</span>
      <span class="action-text">${action.text}</span>
    </div>
  `).join("");
}

const weatherLabel = {
  sunny: "맑음",
  cloudy: "흐림",
  stormy: "거침",
  quiet: "조용",
  low: "낮음",
  normal: "보통",
  high: "높음",
  unknown: "unknown"
};

Object.assign(weatherLabel, {
  observed: "observed",
  sample_full: "sample full",
  notable: "notable",
  active: "active",
  volatile: "volatile",
  limited_data: "limited data"
});

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;"
}[char]));

const tooltipCopy = {
  Issue: "발행된 KGLD 중 아직 사용자에게 배포되지 않고 Issue 컨트랙트에 보관 중인 물량입니다.",
  Redeem: "상환 절차와 관련해 Redeem 컨트랙트에 남아 있는 KGLD 잔액입니다. 실제 실물금 인도 완료 여부와는 별도입니다.",
  SupplyCustody: "KGLD 총공급량이 운영 컨트랙트, 보관 지갑, 외부 지갑에 어떻게 분포되어 있는지 보여줍니다.",
  MarketWeather: "KGLD 자체 활동뿐 아니라 gas, 금 토큰, stablecoin, RWA 신호를 종합해 오늘의 시장 맥락을 요약합니다.",
  TokenizedGoldRadar: "PAXG, XAUT 등 금 기반 토큰의 최근 전송 샘플을 참고해 금 토큰 카테고리 분위기를 관찰합니다.",
  RwaSectorPulse: "금 토큰, stablecoin, gas, RWA 프로토콜 신호를 종합해 RWA 시장 맥락을 보수적으로 해석합니다.",
  NarrativeTrend: "매일 생성된 narrative snapshot을 누적해 최근 흐름을 요약합니다. 단일 조회보다 추세 해석에 가깝습니다.",
  TodayActionBrief: "여러 시장/온체인 카드를 종합해 오늘의 운영, 마케팅, 리스크 액션을 요약합니다.",
  ContentDesk: "온체인 신호와 관련 뉴스/공개자료를 함께 참고해 KGLD 콘텐츠 문안을 제안합니다.",
  observed: "조회 범위 안에서 전송 샘플이 확인됐다는 뜻입니다. 시장이 활발하다는 의미는 아닙니다.",
  sample_full: "최대 조회 개수까지 샘플이 채워졌다는 뜻입니다. 활동 증가를 의미하려면 과거 데이터와 비교가 필요합니다.",
  quiet: "조회는 성공했지만 의미 있는 전송 또는 대형 이동이 제한적이라는 뜻입니다.",
  active: "기준 대비 활동 증가나 명확한 근거가 있을 때만 사용하는 상태입니다.",
  volatile: "대형 이동 또는 급격한 변동 후보가 관찰된 상태입니다. 원인 단정은 금지합니다.",
  limited_data: "아직 충분한 외부 데이터가 연결되지 않아 섹터 전체 판단은 보류한다는 의미입니다.",
  unknown: "데이터가 없거나 조회가 실패해 판단을 보류한 상태입니다.",
  confidence: "현재 카드 판단의 신뢰도입니다. 데이터 소스 수, 조회 성공 여부, 히스토리 축적 정도에 따라 달라집니다.",
  largeTransferDetected: "설정한 기준 이상의 대형 이동 후보가 관찰됐는지 표시합니다. 의도나 방향은 단정하지 않습니다.",
  gasWeather: "Ethereum mainnet gas 비용 상태를 낮음, 보통, 높음으로 요약합니다.",
  stablecoinWeather: "USDC/USDT 전송 샘플을 stablecoin liquidity proxy로 관찰한 상태입니다.",
  goldTokenWeather: "KGLD/PAXG/XAUT 전송 샘플을 금 기반 토큰 카테고리 신호로 요약한 상태입니다.",
  contentMode: "Content Desk가 뉴스와 온체인 중 어떤 근거를 사용했는지 표시합니다.",
  NewsContext: "ITCEN, KorDA, KGLD 관련 기사나 공개자료에서 콘텐츠에 활용 가능한 맥락을 요약합니다.",
  OnchainContext: "Alchemy 기반 온체인 데이터에서 콘텐츠에 참고할 만한 현재 상태를 요약합니다."
};

const tip = (key) => tooltipCopy[key]
  ? `<span class="info-tip" tabindex="0" data-tooltip="${escapeHtml(tooltipCopy[key])}">?</span>`
  : "";

const pendingNarrativeCopy = {
  label: "Narrative pending",
  headline: "시장 내러티브 데이터 수집 대기 중",
  description: "상단 온체인 지표는 정상이며, Market Weather는 다음 narrative cache 갱신 후 표시됩니다."
};

const contentDeskValue = (idea, modernKey, legacyKey, fallbackValue = "") =>
  idea?.[modernKey] || idea?.[legacyKey] || fallbackValue;

const renderNarrativeCards = (narrative, loadMeta = {}) => {
  const market = narrative.marketWeather || fallbackNarrative.marketWeather;
  const idea = narrative.contentIdea || fallbackNarrative.contentIdea;
  const radar = narrative.tokenizedGoldRadar || fallbackNarrative.tokenizedGoldRadar;
  const rwa = narrative.rwaSectorPulse || fallbackNarrative.rwaSectorPulse;
  const trend = narrative.narrativeTrend || fallbackNarrative.narrativeTrend;
  const actionBrief = narrative.todayActionBrief || fallbackNarrative.todayActionBrief;
  const cacheTime = narrative.generatedAt || "unknown";
  const diagnostics = narrative.diagnostics || (narrative.source === "fallback" ? fallbackNarrative.diagnostics : {});
  const isPending = narrative.source !== "alchemy" && diagnostics?.usedFallback === true;
  const diagnosticsErrors = Array.isArray(diagnostics?.errors) ? diagnostics.errors.filter(Boolean) : [];
  const diagnosticsDetails = `
    <details class="diagnostic-details">
      <summary>developer diagnostics</summary>
      <code>url: ${escapeHtml(loadMeta.url || "unknown")}</code>
      <code>source: ${escapeHtml(narrative.source || "unknown")}</code>
      <code>generatedAt: ${escapeHtml(cacheTime)}</code>
      <code>newsSource: ${escapeHtml(loadMeta.newsSource || "unknown")}</code>
      <code>newsItems: ${escapeHtml(String(loadMeta.newsItems ?? "unknown"))}</code>
      <code>usedFallback: ${escapeHtml(String(diagnostics?.usedFallback ?? "unknown"))}</code>
      ${diagnosticsErrors.length ? `<code>errors: ${diagnosticsErrors.map(escapeHtml).join(" / ")}</code>` : ""}
    </details>
  `;
  const displayedMarket = isPending ? {
    ...market,
    stablecoinWeather: "unknown",
    goldTokenWeather: "unknown",
    rwaWeather: "unknown",
    gasWeather: "unknown",
    todayPositioning: pendingNarrativeCopy.headline,
    contentAngle: pendingNarrativeCopy.description,
    confidence: "low"
  } : market;

  document.getElementById("narrative-cache-time").textContent = `Last generated: ${cacheTime}`;
  const displayedActionBrief = isPending ? fallbackNarrative.todayActionBrief : actionBrief;
  const actionStatus = document.getElementById("today-action-status");
  actionStatus.textContent = displayedActionBrief.status || "unknown";
  actionStatus.className = `action-status-pill ${displayedActionBrief.status || "unknown"}`;
  document.getElementById("today-action-brief-content").innerHTML = `
    <p class="action-brief-headline">${displayedActionBrief.headline}</p>
    <div class="action-pill-grid">
      <div class="action-pill">
        <span>Operations</span>
        <strong>${displayedActionBrief.operationsAction}</strong>
      </div>
      <div class="action-pill">
        <span>Marketing</span>
        <strong>${displayedActionBrief.marketingAction}</strong>
      </div>
      <div class="action-pill">
        <span>Risk</span>
        <strong>${displayedActionBrief.riskAction}</strong>
      </div>
    </div>
    <details class="do-not-do-compact">
      <summary>Do Not Say</summary>
      ${(displayedActionBrief.doNotDo || []).map((item) => `<em>${item}</em>`).join("")}
    </details>
    <div class="action-brief-meta">confidence: ${displayedActionBrief.confidence || "low"}</div>
  `;
  document.getElementById("market-weather-content").innerHTML = `
    <div class="weather-badges">
      <span class="weather-badge ${market.stablecoinWeather}">Stablecoin · ${weatherLabel[market.stablecoinWeather] || market.stablecoinWeather} ${tip("stablecoinWeather")}</span>
      <span class="weather-badge ${market.goldTokenWeather}">Gold Token · ${weatherLabel[market.goldTokenWeather] || market.goldTokenWeather} ${tip("goldTokenWeather")}</span>
      <span class="weather-badge ${market.rwaWeather}">RWA · ${weatherLabel[market.rwaWeather] || market.rwaWeather}</span>
      <span class="weather-badge ${market.gasWeather}">Gas · ${weatherLabel[market.gasWeather] || market.gasWeather} ${tip("gasWeather")}</span>
    </div>
    <p class="weather-positioning">${market.todayPositioning}</p>
    <div class="market-meta-line">source: ${narrative.source || "fallback"} · confidence: ${market.confidence} ${tip("confidence")}</div>
  `;

  const marketPanel = document.getElementById("market-weather-content");
  const weatherBadges = marketPanel.querySelectorAll(".weather-badge");
  [
    ["Stablecoin", displayedMarket.stablecoinWeather],
    ["Gold Token", displayedMarket.goldTokenWeather],
    ["RWA", displayedMarket.rwaWeather],
    ["Gas", displayedMarket.gasWeather]
  ].forEach(([label, value], index) => {
    if (weatherBadges[index]) {
      weatherBadges[index].className = `weather-badge ${value}`;
      const key = label === "Stablecoin" ? "stablecoinWeather" : label === "Gold Token" ? "goldTokenWeather" : label === "Gas" ? "gasWeather" : value;
      weatherBadges[index].innerHTML = `${label} · ${weatherLabel[value] || value} ${tip(key)}`;
    }
  });
  marketPanel.querySelector(".weather-positioning").textContent = displayedMarket.todayPositioning;
  marketPanel.querySelector(".market-meta-line").innerHTML = `source: ${narrative.source || "fallback"} · confidence: ${displayedMarket.confidence} ${tip("confidence")}`;
  marketPanel.insertAdjacentHTML("beforeend", diagnosticsDetails);

  if (isPending) {
    const marketContainer = document.getElementById("market-weather-content");
    marketContainer.insertAdjacentHTML("afterbegin", `
      <div class="pending-banner">
        <span>${pendingNarrativeCopy.label}</span>
        <strong>${pendingNarrativeCopy.headline}</strong>
        <p>${pendingNarrativeCopy.description}</p>
      </div>
    `);
    marketContainer.querySelector(".weather-positioning").textContent = pendingNarrativeCopy.headline;
    marketContainer.querySelector(".market-meta-line").innerHTML = `source: ${narrative.source || "fallback"} · confidence: low ${tip("confidence")}`;
  }

  document.getElementById("tokenized-gold-content").innerHTML = `
    <p class="gold-radar-headline">${radar.headline}</p>
    <p class="gold-radar-angle">${radar.kgldAngle}</p>
    <div class="gold-token-rows">
      ${["KGLD", "PAXG", "XAUT"].map((symbol) => {
        const token = radar.tokens?.[symbol] || fallbackNarrative.tokenizedGoldRadar.tokens[symbol];
        return `
          <div class="gold-token-row">
            <strong>${symbol}</strong>
            <span>${token.transferCount} transfers · large ${token.largeTransferDetected ? "yes" : "no"} ${tip("largeTransferDetected")}</span>
            <em class="${token.activity}">${token.activity} ${tip(token.activity)}</em>
          </div>
        `;
      }).join("")}
    </div>
    <div class="gold-observations">
      ${(radar.observations || []).slice(0, 3).map((item) => `<span>${item}</span>`).join("")}
    </div>
    <div class="compact-meta">mood: ${radar.marketMood} ${tip(radar.marketMood)} · confidence: ${radar.confidence} ${tip("confidence")}</div>
  `;

  document.getElementById("rwa-sector-content").innerHTML = `
    <div class="sector-mood ${rwa.sectorMood}">${rwa.sectorMood} ${tip(rwa.sectorMood)}</div>
    <p class="rwa-headline">${rwa.headline}</p>
    <div class="rwa-decision-guide">
      <span>KGLD 활용 기준</span>
      <strong>${rwa.decisionGuide || rwa.kgldPositioning}</strong>
    </div>
    <div class="rwa-signal-grid">
      <div><span>Tokenized Gold</span><strong>${rwa.signals?.tokenizedGold?.status || "unknown"} ${tip(rwa.signals?.tokenizedGold?.status || "unknown")}</strong></div>
      <div><span>Stablecoins ${tip("stablecoinWeather")}</span><strong>${rwa.signals?.stablecoins?.status || "unknown"} ${tip(rwa.signals?.stablecoins?.status || "unknown")}</strong></div>
      <div><span>Gas ${tip("gasWeather")}</span><strong>${rwa.signals?.gas?.status || "unknown"} ${tip(rwa.signals?.gas?.status || "unknown")}</strong></div>
      <div><span>RWA Protocols</span><strong>${rwa.signals?.rwaProtocols?.status || "unknown"} ${tip(rwa.signals?.rwaProtocols?.status || "unknown")}</strong></div>
    </div>
    <div class="rwa-evidence">
      ${(rwa.evidence || []).slice(0, 3).map((item) => `<span>${item}</span>`).join("")}
    </div>
    <div class="compact-meta">confidence: ${rwa.confidence} ${tip("confidence")}</div>
  `;

  const relatedNewsItems = (idea.newsContext?.relatedItems || []).slice(0, 3);
  document.getElementById("content-idea-content").innerHTML = `
    <div class="content-desk-topline">
      <span class="content-mode-badge">${idea.contentMode || "onchain_only"} ${tip("contentMode")}</span>
      <strong>${idea.primaryAngle || idea.contentAngle}</strong>
    </div>
    <p class="one-line-insight">${idea.oneLineInsight}</p>
    <div class="context-brief-grid">
      <div class="context-brief">
        <span>News Context ${tip("NewsContext")}</span>
        <strong>${idea.newsContext?.headline || "뉴스 컨텍스트가 제한적입니다."}</strong>
        <p>${idea.newsContext?.keyMessage || "뉴스 기반 메시지는 보수적으로만 사용합니다."}</p>
      </div>
      <div class="context-brief">
        <span>Onchain Context ${tip("OnchainContext")}</span>
        <strong>${idea.onchainContext?.headline || "온체인 컨텍스트가 제한적입니다."}</strong>
        <p>${idea.onchainContext?.keyMessage || "narrative cache 갱신 후 표시됩니다."}</p>
      </div>
    </div>
    ${relatedNewsItems.length ? `
      <div class="related-news-list">
        <span>Related Items</span>
        ${relatedNewsItems.map((item) => `
          ${String(item.url || "").startsWith("TODO:") ? `<div class="related-news-pending">` : `<a href="${escapeHtml(item.url || "#")}" target="_blank" rel="noreferrer">`}
            <strong>${escapeHtml(item.title || "Untitled")}</strong>
            <em>${escapeHtml(item.publisher || "unknown")} · ${escapeHtml(item.publishedAt || "unknown")} · ${escapeHtml(item.relevance || "low")}</em>
            ${String(item.url || "").startsWith("TODO:") ? `<small>${escapeHtml(item.url)}</small>` : ""}
          ${String(item.url || "").startsWith("TODO:") ? `</div>` : `</a>`}
        `).join("")}
      </div>
    ` : ""}
    <div class="content-desk-grid">
      <div class="content-desk-section">
        <div class="content-desk-head">
          <span>EN Post</span>
          <button type="button" class="copy-mini" data-copy-text="${escapeHtml(contentDeskValue(idea, "xPostEnglish", "tweetDraftEnglish"))}">Copy</button>
        </div>
        <p>${contentDeskValue(idea, "xPostEnglish", "tweetDraftEnglish")}</p>
      </div>
      <div class="content-desk-section korean">
        <div class="content-desk-head">
          <span>KR Post</span>
          <button type="button" class="copy-mini" data-copy-text="${escapeHtml(contentDeskValue(idea, "xPostKorean", "tweetDraftKorean"))}">Copy</button>
        </div>
        <p>${contentDeskValue(idea, "xPostKorean", "tweetDraftKorean")}</p>
      </div>
      <div class="content-desk-section">
        <span>Internal Note</span>
        <p>${idea.internalNote || idea.whyNow}</p>
      </div>
      <div class="content-desk-section">
        <span>Landing Copy</span>
        <p>${idea.landingCopy || idea.oneLineInsight}</p>
      </div>
    </div>
    <div class="briefing-note content-why-now">
      <span>why now</span>
      <strong>${idea.whyNow}</strong>
    </div>
    <details class="do-not-say">
      <summary>Caution / Do not say</summary>
      ${(idea.complianceCaution || []).map((item) => `<em>${item}</em>`).join("")}
      ${(idea.doNotSay || []).map((item) => `<em>${item}</em>`).join("")}
    </details>
  `;

  document.getElementById("narrative-trend-content").innerHTML = `
    <div class="trend-mood ${trend.trendMood || "unknown"}">${trend.trendMood || "unknown"}</div>
    <p class="trend-headline">${trend.headline || "추세 데이터 축적 중"}</p>
    <div class="trend-metric-grid">
      <div><span>KGLD Quiet Streak</span><strong>${trend.kgldQuietStreak ?? 0}</strong></div>
      <div><span>Gold Token Observed Days</span><strong>${trend.goldTokenObservedDays ?? 0}</strong></div>
      <div><span>Stablecoin Observed Days</span><strong>${trend.stablecoinObservedDays ?? 0}</strong></div>
      <div><span>Gas Low Days</span><strong>${trend.gasLowDays ?? 0}</strong></div>
    </div>
    <div class="briefing-note">
      <span>KGLD implication</span>
      <strong>${trend.kgldImplication || "추세 데이터 축적 중입니다."}</strong>
      <em>large-transfer days: ${trend.notableLargeTransferDays ?? 0} · confidence: ${trend.confidence || "low"}</em>
    </div>
  `;
};

const narrativeCacheUrl = () => {
  const url = new URL("data/narrative-cache.json", appBaseUrl);
  url.searchParams.set("v", Date.now().toString());
  return url.toString();
};

const newsContextUrl = () => {
  const url = new URL("data/news-context.json", appBaseUrl);
  url.searchParams.set("v", Date.now().toString());
  return url.toString();
};

const loadNarrativeCache = async () => {
  const url = narrativeCacheUrl();
  const newsUrl = newsContextUrl();
  try {
    console.log("Loaded narrative cache URL:", url);
    console.log("Loaded news context URL:", newsUrl);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`cache HTTP ${response.status}`);
    }
    const narrative = await response.json();
    const newsContext = await fetch(newsUrl, { cache: "no-store" })
      .then((newsResponse) => newsResponse.ok ? newsResponse.json() : null)
      .catch(() => null);
    console.log("loaded source:", narrative.source || "unknown");
    console.log("loaded generatedAt:", narrative.generatedAt || "unknown");
    console.log("loaded news source:", newsContext?.source || "unknown");
    console.log("usedFallback:", narrative.diagnostics?.usedFallback);
    renderNarrativeCards(narrative, {
      url,
      newsUrl,
      newsSource: newsContext?.source,
      newsItems: newsContext?.items?.length
    });
  } catch (error) {
    console.warn("Narrative cache load failed:", error);
    renderNarrativeCards(fallbackNarrative, { url, newsUrl });
  }
};

document.getElementById("refresh-narrative").addEventListener("click", async () => {
  const button = document.getElementById("refresh-narrative");
  button.textContent = "Reloading...";
  await loadNarrativeCache();
  button.textContent = "Reload Narrative";
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest(".copy-mini");
  if (!button) return;

  try {
    await navigator.clipboard.writeText(button.dataset.copyText || "");
    button.textContent = "Copied";
  } catch {
    button.textContent = "Copy failed";
  }

  window.setTimeout(() => {
    button.textContent = "Copy";
  }, 1400);
});

loadNarrativeCache();

document.getElementById("transaction-count").textContent = `${data.transactions.length}건`;
document.getElementById("transaction-content").innerHTML = data.transactions.length
  ? `<div class="transaction-table">${data.transactions.map((tx) => `
      <div class="transaction-row">
        <span>${tx.time}</span>
        <strong>${tx.type}</strong>
        <span>${tx.amount} KGLD</span>
        <a href="${etherscan("tx", tx.hash)}" target="_blank" rel="noreferrer">${shortAddress(tx.hash)}</a>
      </div>
    `).join("")}</div>`
  : `<div class="empty-state"><div><strong>최근 24시간 거래가 없습니다</strong><span>새로운 Transfer 이벤트가 감지되면 이 영역에 표시됩니다.</span></div></div>`;
