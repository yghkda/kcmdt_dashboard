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
      inference: "추가 이상 징후는 위험 모니터와 권장 조치에서 확인하세요."
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
  contentIdea: {
    title: "KGLD Content Idea",
    contentAngle: "insufficient_data",
    oneLineInsight: "데이터가 부족하면 추정하지 않고 unknown 상태로 유지합니다.",
    tweetDraftEnglish: "Narrative data is not available yet.",
    tweetDraftKorean: "내러티브 데이터가 아직 준비되지 않았습니다.",
    whyNow: "캐시 데이터를 불러오지 못했습니다.",
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
    evidence: ["tokenized gold, stablecoin, gas 일부 신호만 우선 관찰합니다."],
    contentIdea: "RWA transparency over hype",
    confidence: "low",
    signals: {
      tokenizedGold: { status: "unknown", source: "tokenizedGoldRadar" },
      stablecoins: { status: "unknown", usdcTransferCount: 0, usdtTransferCount: 0 },
      gas: { status: "unknown" },
      rwaProtocols: { status: "limited_data", note: "Dune/The Graph 또는 protocol-specific 데이터 연결 전입니다." }
    }
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

document.getElementById("action-list").innerHTML = data.actions.map((action) => `
  <div class="action-row">
    <span class="priority">${action.priority}</span>
    <span class="action-text">${action.text}</span>
  </div>
`).join("");

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

const pendingNarrativeCopy = {
  label: "Narrative pending",
  headline: "시장 내러티브 데이터 수집 대기 중",
  description: "상단 온체인 지표는 정상이며, Market Weather는 다음 narrative cache 갱신 후 표시됩니다."
};

const renderNarrativeCards = (narrative, loadMeta = {}) => {
  const market = narrative.marketWeather || fallbackNarrative.marketWeather;
  const idea = narrative.contentIdea || fallbackNarrative.contentIdea;
  const radar = narrative.tokenizedGoldRadar || fallbackNarrative.tokenizedGoldRadar;
  const rwa = narrative.rwaSectorPulse || fallbackNarrative.rwaSectorPulse;
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
  document.getElementById("market-weather-content").innerHTML = `
    <div class="weather-badges">
      <span class="weather-badge ${market.stablecoinWeather}">Stablecoin · ${weatherLabel[market.stablecoinWeather] || market.stablecoinWeather}</span>
      <span class="weather-badge ${market.goldTokenWeather}">Gold Token · ${weatherLabel[market.goldTokenWeather] || market.goldTokenWeather}</span>
      <span class="weather-badge ${market.rwaWeather}">RWA · ${weatherLabel[market.rwaWeather] || market.rwaWeather}</span>
      <span class="weather-badge ${market.gasWeather}">Gas · ${weatherLabel[market.gasWeather] || market.gasWeather}</span>
    </div>
    <p class="weather-positioning">${market.todayPositioning}</p>
    <div class="briefing-note">
      <span>왜 중요한가</span>
      <strong>${market.contentAngle}</strong>
      <em>source: ${narrative.source || "fallback"} · confidence: ${market.confidence}</em>
    </div>
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
      weatherBadges[index].textContent = `${label} · ${weatherLabel[value] || value}`;
    }
  });
  marketPanel.querySelector(".weather-positioning").textContent = displayedMarket.todayPositioning;
  marketPanel.querySelector(".briefing-note strong").textContent = displayedMarket.contentAngle;
  marketPanel.querySelector(".briefing-note em").textContent = `source: ${narrative.source || "fallback"} · confidence: ${displayedMarket.confidence}`;
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
    marketContainer.querySelector(".briefing-note strong").textContent = pendingNarrativeCopy.description;
    marketContainer.querySelector(".briefing-note em").textContent = `source: ${narrative.source || "fallback"} · confidence: low`;
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
            <span>${token.transferCount} transfers · large ${token.largeTransferDetected ? "yes" : "no"}</span>
            <em class="${token.activity}">${token.activity}</em>
          </div>
        `;
      }).join("")}
    </div>
    <div class="gold-observations">
      ${(radar.observations || []).slice(0, 3).map((item) => `<span>${item}</span>`).join("")}
    </div>
    <div class="briefing-note">
      <span>operator action</span>
      <strong>${radar.operatorAction}</strong>
      <em>mood: ${radar.marketMood} · confidence: ${radar.confidence}</em>
    </div>
  `;

  document.getElementById("rwa-sector-content").innerHTML = `
    <div class="sector-mood ${rwa.sectorMood}">${rwa.sectorMood}</div>
    <p class="rwa-headline">${rwa.headline}</p>
    <p class="rwa-positioning">${rwa.kgldPositioning}</p>
    <div class="rwa-signal-grid">
      <div><span>Tokenized Gold</span><strong>${rwa.signals?.tokenizedGold?.status || "unknown"}</strong></div>
      <div><span>Stablecoins</span><strong>${rwa.signals?.stablecoins?.status || "unknown"}</strong></div>
      <div><span>Gas</span><strong>${rwa.signals?.gas?.status || "unknown"}</strong></div>
      <div><span>RWA Protocols</span><strong>${rwa.signals?.rwaProtocols?.status || "unknown"}</strong></div>
    </div>
    <div class="rwa-evidence">
      ${(rwa.evidence || []).slice(0, 3).map((item) => `<span>${item}</span>`).join("")}
    </div>
    <div class="briefing-note">
      <span>content idea</span>
      <strong>${rwa.contentIdea}</strong>
      <em>confidence: ${rwa.confidence}</em>
    </div>
  `;

  document.getElementById("content-idea-content").innerHTML = `
    <div class="content-angle">${idea.contentAngle}</div>
    <p class="one-line-insight">${idea.oneLineInsight}</p>
    <div class="tweet-box">
      <span>EN draft</span>
      <p>${idea.tweetDraftEnglish}</p>
    </div>
    <div class="tweet-box korean">
      <span>KR draft</span>
      <p>${idea.tweetDraftKorean}</p>
    </div>
    <div class="briefing-note">
      <span>why now</span>
      <strong>${idea.whyNow}</strong>
    </div>
    <div class="do-not-say">
      <span>Do not say</span>
      ${(idea.doNotSay || []).map((item) => `<em>${item}</em>`).join("")}
    </div>
  `;
};

const narrativeCacheUrl = () => {
  const url = new URL("data/narrative-cache.json", appBaseUrl);
  url.searchParams.set("v", Date.now().toString());
  return url.toString();
};

const loadNarrativeCache = async () => {
  const url = narrativeCacheUrl();
  try {
    console.log("Loaded narrative cache URL:", url);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`cache HTTP ${response.status}`);
    }
    const narrative = await response.json();
    console.log("loaded source:", narrative.source || "unknown");
    console.log("loaded generatedAt:", narrative.generatedAt || "unknown");
    console.log("usedFallback:", narrative.diagnostics?.usedFallback);
    renderNarrativeCards(narrative, { url });
  } catch (error) {
    console.warn("Narrative cache load failed:", error);
    renderNarrativeCards(fallbackNarrative, { url });
  }
};

document.getElementById("refresh-narrative").addEventListener("click", async () => {
  const button = document.getElementById("refresh-narrative");
  button.textContent = "Reloading...";
  await loadNarrativeCache();
  button.textContent = "Reload Narrative";
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
