const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const dashboardPath = path.resolve("outputs/kgld-dashboard/dashboard-data.js");
const imagePath = path.resolve("outputs/kgld-dashboard/kgld-daily-dashboard.png");
const bundlePath = path.resolve("outputs/kgld-dashboard/kgld-dashboard-html.zip");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function loadDashboardData(filePath) {
  const script = fs.readFileSync(filePath, "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(script, context);
  return context.window.KGLD_DASHBOARD_DATA;
}

async function callTelegram(method, body, isMultipart = false) {
  const token = requireEnv("KGLD_TELEGRAM_TOKEN");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    body,
    headers: isMultipart ? undefined : { "content-type": "application/json; charset=utf-8" }
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(`Telegram ${method} failed: ${JSON.stringify(result)}`);
  }
}

async function sendMessage(data) {
  const chatId = requireEnv("KGLD_TELEGRAM_CHAT_ID");
  const message = [
    "KGLD Daily Onchain Dashboard",
    "",
    `상태: ${data.status}`,
    `총공급량: ${data.kpis[0].value} KGLD`,
    `24시간 거래 수: ${data.kpis[1].value}건`,
    `발행 / 소각: ${data.kpis[3].value} / ${data.kpis[4].value} KGLD`,
    `Issue 잔액: ${data.balances.issue.value} KGLD`,
    `Redeem 잔액: ${data.balances.redeem.value} KGLD`,
    `업데이트: ${data.updatedAt}`,
    "",
    data.statusMessage
  ].join("\n");

  await callTelegram("sendMessage", JSON.stringify({
    chat_id: chatId,
    text: message,
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [[
        { text: "KGLD Token", url: `https://etherscan.io/token/${data.contracts.token}` },
        { text: "Issue", url: `https://etherscan.io/address/${data.contracts.issue}` },
        { text: "Redeem", url: `https://etherscan.io/address/${data.contracts.redeem}` }
      ]]
    }
  }));
}

async function sendDocument(filePath, caption) {
  const chatId = requireEnv("KGLD_TELEGRAM_CHAT_ID");
  const form = new FormData();
  form.set("chat_id", chatId);
  form.set("caption", caption);
  form.set("document", new Blob([fs.readFileSync(filePath)]), path.basename(filePath));
  await callTelegram("sendDocument", form, true);
}

async function main() {
  const data = loadDashboardData(dashboardPath);
  await sendMessage(data);
  await sendDocument(imagePath, "렌더링된 KGLD 대시보드 PNG입니다.");
  await sendDocument(bundlePath, "로컬 확인용 HTML 대시보드 묶음입니다.");
  console.log("Telegram dashboard package sent successfully.");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
