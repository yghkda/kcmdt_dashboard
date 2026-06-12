import fs from "node:fs/promises";
import path from "node:path";

const DASHBOARD_PATH = path.resolve("outputs/kgld-dashboard/dashboard-data.js");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const TOKEN_ADDRESS = "0xD1479fD673D9767E6c6E46eF6Bc640ff1F6Eb9CE";
const ISSUE_ADDRESS = "0xd5A62Dd28BF16229b4Dd9687DECC233548B9AA95";
const REDEEM_ADDRESS = "0xe257fe24611CfabCa4a48869C1222D1cC2602E70";
const DECIMALS = 18n;
const SCALE = 10n ** DECIMALS;
const ERC20_TOTAL_SUPPLY = "0x18160ddd";
const ERC20_BALANCE_OF = "0x70a08231";
const TRANSFER_PAGE_SIZE = "0x3e8";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getRpcUrl() {
  if (process.env.ALCHEMY_ETH_MAINNET_URL) {
    return process.env.ALCHEMY_ETH_MAINNET_URL;
  }
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (apiKey) {
    return `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;
  }
  throw new Error("Set ALCHEMY_ETH_MAINNET_URL or ALCHEMY_API_KEY.");
}

async function rpc(method, params) {
  const response = await fetch(getRpcUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`RPC ${method} failed with HTTP ${response.status}: ${detail}`);
  }
  const payload = await response.json();
  if (payload.error) {
    throw new Error(`RPC ${method} error: ${payload.error.message}`);
  }
  return payload.result;
}

function hexToBigInt(value) {
  return BigInt(value);
}

function formatToken(value, fractionDigits = 8) {
  const sign = value < 0n ? "-" : "";
  const abs = value < 0n ? -value : value;
  const whole = abs / SCALE;
  const fraction = abs % SCALE;
  if (fractionDigits === 0) {
    return `${sign}${whole.toString()}`;
  }
  const rawFraction = fraction.toString().padStart(Number(DECIMALS), "0").slice(0, fractionDigits);
  const trimmed = rawFraction.replace(/0+$/, "");
  return trimmed ? `${sign}${whole.toString()}.${trimmed}` : `${sign}${whole.toString()}`;
}

function toNumberToken(value, fractionDigits = 8) {
  return Number(formatToken(value, fractionDigits));
}

function formatPercent(part, total) {
  if (total === 0n) {
    return 0;
  }
  return Number((((part * 10000n) / total)).toString()) / 100;
}

function encodeAddressCall(selector, address) {
  return `${selector}${address.toLowerCase().replace(/^0x/, "").padStart(64, "0")}`;
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
    if (part.type !== "literal") {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} KST`;
}

async function getBlockByNumber(blockNumber) {
  const hex = `0x${blockNumber.toString(16)}`;
  return rpc("eth_getBlockByNumber", [hex, false]);
}

async function findStartBlock(latestBlockNumber, cutoffTimestamp) {
  let low = 0;
  let high = latestBlockNumber;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const block = await getBlockByNumber(mid);
    const blockTimestamp = Number(hexToBigInt(block.timestamp));
    if (blockTimestamp < cutoffTimestamp) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

function parseTransferAmount(transfer) {
  if (transfer.rawContract?.value) {
    return BigInt(transfer.rawContract.value);
  }
  if (transfer.value !== undefined && transfer.value !== null) {
    const normalized = String(transfer.value);
    const [wholePart, fractionPart = ""] = normalized.split(".");
    const whole = BigInt(wholePart || "0") * SCALE;
    const fraction = BigInt((fractionPart + "0".repeat(Number(DECIMALS))).slice(0, Number(DECIMALS)) || "0");
    return whole + fraction;
  }
  return 0n;
}

async function getAssetTransfers(fromBlock, toBlock) {
  const transfers = [];
  let pageKey;

  while (true) {
    const result = await rpc("alchemy_getAssetTransfers", [
      {
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${toBlock.toString(16)}`,
        category: ["erc20"],
        contractAddresses: [TOKEN_ADDRESS],
        withMetadata: true,
        excludeZeroValue: false,
        maxCount: TRANSFER_PAGE_SIZE,
        order: "desc",
        ...(pageKey ? { pageKey } : {})
      }
    ]);

    transfers.push(...(result.transfers || []));
    if (!result.pageKey) {
      break;
    }
    pageKey = result.pageKey;
  }

  return transfers;
}

async function readChainData() {
  const [latestHex, totalSupplyHex, issueBalanceHex, redeemBalanceHex] = await Promise.all([
    rpc("eth_blockNumber", []),
    rpc("eth_call", [{ to: TOKEN_ADDRESS, data: ERC20_TOTAL_SUPPLY }, "latest"]),
    rpc("eth_call", [{ to: TOKEN_ADDRESS, data: encodeAddressCall(ERC20_BALANCE_OF, ISSUE_ADDRESS) }, "latest"]),
    rpc("eth_call", [{ to: TOKEN_ADDRESS, data: encodeAddressCall(ERC20_BALANCE_OF, REDEEM_ADDRESS) }, "latest"])
  ]);

  const latestBlock = Number(hexToBigInt(latestHex));
  const latestBlockData = await getBlockByNumber(latestBlock);
  const latestTimestamp = Number(hexToBigInt(latestBlockData.timestamp));
  const cutoffTimestamp = latestTimestamp - 24 * 60 * 60;
  const startBlock = await findStartBlock(latestBlock, cutoffTimestamp);
  const transfers = await getAssetTransfers(startBlock, latestBlock);

  const totalSupply = hexToBigInt(totalSupplyHex);
  const issueBalance = hexToBigInt(issueBalanceHex);
  const redeemBalance = hexToBigInt(redeemBalanceHex);
  const circulatingBalance = totalSupply - issueBalance - redeemBalance;

  const transactions = [];
  let minted = 0n;
  let burned = 0n;
  let volume = 0n;
  let issueInbound = 0n;
  let issueOutbound = 0n;
  let redeemInbound = 0n;
  let redeemOutbound = 0n;

  for (const transfer of transfers) {
    const from = String(transfer.from || ZERO_ADDRESS).toLowerCase();
    const to = String(transfer.to || ZERO_ADDRESS).toLowerCase();
    const amount = parseTransferAmount(transfer);
    const timestamp = transfer.metadata?.blockTimestamp
      ? Math.floor(new Date(transfer.metadata.blockTimestamp).getTime() / 1000)
      : latestTimestamp;
    volume += amount;

    if (from === ZERO_ADDRESS) {
      minted += amount;
    }
    if (to === ZERO_ADDRESS) {
      burned += amount;
    }
    if (to === ISSUE_ADDRESS.toLowerCase()) {
      issueInbound += amount;
    }
    if (from === ISSUE_ADDRESS.toLowerCase()) {
      issueOutbound += amount;
    }
    if (to === REDEEM_ADDRESS.toLowerCase()) {
      redeemInbound += amount;
    }
    if (from === REDEEM_ADDRESS.toLowerCase()) {
      redeemOutbound += amount;
    }

    transactions.push({
      time: asKstString(new Date(timestamp * 1000)),
      type: from === ZERO_ADDRESS ? "mint" : to === ZERO_ADDRESS ? "burn" : to === ISSUE_ADDRESS.toLowerCase() ? "issue_in" : from === ISSUE_ADDRESS.toLowerCase() ? "issue_out" : to === REDEEM_ADDRESS.toLowerCase() ? "redeem_in" : from === REDEEM_ADDRESS.toLowerCase() ? "redeem_out" : "transfer",
      from,
      to,
      amount: formatToken(amount),
      hash: transfer.hash
    });
  }

  transactions.sort((a, b) => (a.time < b.time ? 1 : -1));

  return {
    latestBlock,
    updatedAt: asKstString(new Date()),
    totalSupply,
    issueBalance,
    redeemBalance,
    circulatingBalance,
    transferCount: transfers.length,
    minted,
    burned,
    volume,
    issueInbound,
    issueOutbound,
    redeemInbound,
    redeemOutbound,
    transactions: transactions.slice(0, 10)
  };
}

function buildStatus(data) {
  const facts = [];
  const inferences = [];
  let status = "정상";
  let statusLevel = "normal";

  facts.push(`최근 24시간 KGLD Transfer ${data.transferCount}건`);
  facts.push(`발행 ${formatToken(data.minted)} KGLD, 소각 ${formatToken(data.burned)} KGLD`);

  if (data.transferCount === 0) {
    facts.push("Issue 및 Redeem 관련 신규 이동 없음");
  } else {
    facts.push(`Issue 유입 ${formatToken(data.issueInbound)} / 유출 ${formatToken(data.issueOutbound)} KGLD`);
    facts.push(`Redeem 유입 ${formatToken(data.redeemInbound)} / 유출 ${formatToken(data.redeemOutbound)} KGLD`);
  }

  const issueShare = formatPercent(data.issueBalance, data.totalSupply);
  if (issueShare >= 50) {
    status = "집중 관찰";
    statusLevel = "watch";
    inferences.push("Issue 컨트랙트가 발행 자산의 과반을 보관 중이어서 운영 배포 흐름 집중도가 높습니다.");
  } else {
    inferences.push("Issue 잔액은 발행 자산 보관 및 배포 대기 물량을 포함할 수 있습니다.");
  }

  if (data.minted > 0n || data.burned > 0n) {
    status = "공급 변동";
    statusLevel = "watch";
    inferences.push("최근 24시간 공급량 변동이 발생해 발행·소각 사유 점검이 필요합니다.");
  }

  return {
    status,
    statusLevel,
    statusMessage: `관찰 사실: ${facts.join(". ")}. 추정: ${inferences.join(" ")}`
  };
}

function buildDashboardData(data) {
  const { status, statusLevel, statusMessage } = buildStatus(data);
  const issuePct = formatPercent(data.issueBalance, data.totalSupply);
  const redeemPct = formatPercent(data.redeemBalance, data.totalSupply);
  const circulatingPct = formatPercent(data.circulatingBalance, data.totalSupply);
  const zeroChange = "0";

  return {
    updatedAt: data.updatedAt,
    period: "최근 24시간",
    network: "Ethereum Mainnet",
    latestBlock: data.latestBlock,
    status,
    statusLevel,
    statusMessage,
    contracts: {
      token: TOKEN_ADDRESS,
      issue: ISSUE_ADDRESS,
      redeem: REDEEM_ADDRESS
    },
    kpis: [
      { label: "총공급량", value: formatToken(data.totalSupply), unit: "KGLD", change: zeroChange, tone: "neutral" },
      { label: "24시간 전송", value: String(data.transferCount), unit: "건", change: zeroChange, tone: data.transferCount > 0 ? "watch" : "neutral" },
      { label: "24시간 거래량", value: formatToken(data.volume), unit: "KGLD", change: zeroChange, tone: data.volume > 0n ? "watch" : "neutral" },
      { label: "발행", value: formatToken(data.minted), unit: "KGLD", change: zeroChange, tone: data.minted > 0n ? "watch" : "neutral" },
      { label: "소각", value: formatToken(data.burned), unit: "KGLD", change: zeroChange, tone: data.burned > 0n ? "watch" : "neutral" },
      { label: "Issue 보관 비중", value: issuePct.toFixed(2), unit: "%", change: zeroChange, tone: issuePct >= 50 ? "watch" : "neutral" }
    ],
    balances: {
      issue: { value: toNumberToken(data.issueBalance), percentage: issuePct, change: 0 },
      redeem: { value: toNumberToken(data.redeemBalance), percentage: redeemPct, change: 0 },
      circulating: { value: toNumberToken(data.circulatingBalance), percentage: circulatingPct, change: 0 }
    },
    activity: {
      issue: {
        inbound: toNumberToken(data.issueInbound),
        outbound: toNumberToken(data.issueOutbound),
        count: data.transactions.filter((tx) => tx.type === "issue_in" || tx.type === "issue_out" || tx.type === "mint").length,
        note: data.transferCount === 0 ? "발행 자산 보관 및 배포 흐름 변동 없음" : "발행 자산 보관 및 배포 흐름 관찰"
      },
      redeem: {
        inbound: toNumberToken(data.redeemInbound),
        outbound: toNumberToken(data.redeemOutbound),
        count: data.transactions.filter((tx) => tx.type === "redeem_in" || tx.type === "redeem_out" || tx.type === "burn").length,
        note: data.transferCount === 0 ? "상환 관련 이동 없음" : "상환 관련 이동 관찰"
      }
    },
    transactions: data.transactions,
    risks: [
      {
        level: data.transferCount > 0 ? "WATCH" : "INFO",
        title: "최근 24시간 전송",
        detail: `관찰 사실: KGLD Transfer ${data.transferCount}건, 총 ${formatToken(data.volume)} KGLD 이동.`
      },
      {
        level: issuePct >= 50 ? "WATCH" : "INFO",
        title: "Issue 보관 구조",
        detail: `관찰 사실: Issue 컨트랙트 잔액 ${formatToken(data.issueBalance)} KGLD (${issuePct.toFixed(2)}%). 추정: 발행 자산 보관 및 배포 대기 물량이 포함될 수 있습니다.`
      },
      {
        level: data.minted > 0n || data.burned > 0n ? "WATCH" : "INFO",
        title: "공급량 변동",
        detail: `관찰 사실: 최근 24시간 발행 ${formatToken(data.minted)} KGLD, 소각 ${formatToken(data.burned)} KGLD.`
      }
    ],
    actions: [
      { priority: "P1", text: "Issue 컨트랙트의 보관 잔액과 외부 배포 흐름을 함께 추적" },
      { priority: "P2", text: "발행 또는 소각이 발생한 날에는 관련 트랜잭션 해시와 운영 사유를 대조" },
      { priority: "P3", text: "Redeem 유입·유출이 늘어날 경우 상환 수요 변화와 공급량 변동을 함께 점검" }
    ]
  };
}

async function writeDashboardFile(data) {
  const serialized = `window.KGLD_DASHBOARD_DATA = ${JSON.stringify(data, null, 2)};\n`;
  await fs.writeFile(DASHBOARD_PATH, serialized, "utf8");
}

async function main() {
  requireEnv("TZ");
  const chainData = await readChainData();
  const dashboardData = buildDashboardData(chainData);
  await writeDashboardFile(dashboardData);
  console.log(`Updated dashboard at block ${chainData.latestBlock} with ${chainData.transferCount} transfers.`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
