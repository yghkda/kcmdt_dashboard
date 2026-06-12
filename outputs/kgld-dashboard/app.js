const data = window.KGLD_DASHBOARD_DATA;

const shortAddress = (address) => `${address.slice(0, 6)}…${address.slice(-4)}`;
const etherscan = (type, value) => `https://etherscan.io/${type}/${value}`;
const formatToken = (value) => Number(value).toLocaleString("ko-KR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 8
});

document.getElementById("updated-at").textContent = `업데이트 ${data.updatedAt}`;
document.getElementById("period-label").textContent = data.period;
document.getElementById("block-label").textContent = `Block ${data.latestBlock.toLocaleString("ko-KR")}`;
document.getElementById("status-badge").textContent = data.status;
document.getElementById("status-badge").classList.add(data.statusLevel);
document.getElementById("status-message").textContent = data.statusMessage;
document.getElementById("hero-supply").textContent = `${data.kpis[0].value} KGLD`;

[
  ["token-link", "token", data.contracts.token],
  ["issue-link", "address", data.contracts.issue],
  ["redeem-link", "address", data.contracts.redeem]
].forEach(([id, type, address]) => {
  const link = document.getElementById(id);
  link.href = etherscan(type, address);
  link.textContent += ` ${shortAddress(address)} ↗`;
});

document.getElementById("kpi-grid").innerHTML = data.kpis.map((kpi) => `
  <article class="kpi-card ${kpi.tone}">
    <div class="kpi-label">${kpi.label}</div>
    <div class="kpi-value">${kpi.value}<span class="kpi-unit">${kpi.unit}</span></div>
    <div class="kpi-change">${kpi.change === "0" ? "- 변동 없음" : kpi.change}</div>
  </article>
`).join("");

const balanceConfig = [
  ["Issue Contract · 발행 자산", data.balances.issue, "var(--gold)"],
  ["Redeem Contract", data.balances.redeem, "var(--mint)"],
  ["기타 유통량", data.balances.circulating, "#345048"]
];

document.getElementById("balance-list").innerHTML = balanceConfig.map(([name, item, color]) => `
  <div class="balance-row">
    <span class="color-key" style="background:${color}"></span>
    <span class="balance-name">${name}</span>
    <span class="balance-value">${formatToken(item.value)} KGLD<span>${item.percentage.toFixed(2)}% · 변동 없음</span></span>
  </div>
`).join("");

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

document.getElementById("transaction-count").textContent = `${data.transactions.length}건`;
document.getElementById("transaction-content").innerHTML = data.transactions.length
  ? `<div class="transaction-table">${data.transactions.map((tx) => `
      <a href="${etherscan("tx", tx.hash)}" target="_blank" rel="noreferrer">${tx.hash}</a>
    `).join("")}</div>`
  : `<div class="empty-state"><div><strong>최근 24시간 거래가 없습니다</strong><span>새로운 Transfer 이벤트가 감지되면 이 영역에 표시됩니다.</span></div></div>`;
