window.KGLD_DASHBOARD_DATA = {
  updatedAt: "2026-06-12 09:55:50 KST",
  period: "최근 24시간",
  network: "Ethereum Mainnet",
  latestBlock: 25291613,
  status: "조회 제한",
  statusLevel: "alert",
  statusMessage: "관찰 사실: 이번 실행 환경에서는 Alchemy MCP가 노출되지 않았고 외부 RPC/익스플로러 연결도 차단되었습니다. 추정: 아래 수치와 거래 목록은 신규 온체인 갱신이 아니라 직전 스냅샷 유지 값입니다.",
  contracts: {
    token: "0xD1479fD673D9767E6c6E46eF6Bc640ff1F6Eb9CE",
    issue: "0xd5A62Dd28BF16229b4Dd9687DECC233548B9AA95",
    redeem: "0xe257fe24611CfabCa4a48869C1222D1cC2602E70"
  },
  kpis: [
    { label: "총공급량", value: "1.20492435", unit: "KGLD", change: "스냅샷 유지", tone: "watch" },
    { label: "24시간 전송", value: "0", unit: "건", change: "실시간 조회 실패", tone: "watch" },
    { label: "24시간 거래량", value: "0", unit: "KGLD", change: "실시간 조회 실패", tone: "watch" },
    { label: "발행", value: "0", unit: "KGLD", change: "실시간 조회 실패", tone: "watch" },
    { label: "소각", value: "0", unit: "KGLD", change: "실시간 조회 실패", tone: "watch" },
    { label: "Issue 보관 비중", value: "44.20", unit: "%", change: "스냅샷 유지", tone: "watch" }
  ],
  balances: {
    issue: { value: 0.53263476, percentage: 44.2048, change: 0 },
    redeem: { value: 0.50082762, percentage: 41.5651, change: 0 },
    circulating: { value: 0.17146197, percentage: 14.2301, change: 0 }
  },
  activity: {
    issue: {
      inbound: 0,
      outbound: 0,
      count: 0,
      note: "실시간 유입·유출 조회 실패"
    },
    redeem: {
      inbound: 0,
      outbound: 0,
      count: 0,
      note: "실시간 유입·유출 조회 실패"
    }
  },
  transactions: [],
  risks: [
    {
      level: "ALERT",
      title: "온체인 조회 실패",
      detail: "관찰 사실: Alchemy MCP 미노출 및 외부 네트워크 차단으로 최근 24시간 KGLD Transfer를 새로 수집하지 못했습니다."
    },
    {
      level: "INFO",
      title: "Issue 보관 구조",
      detail: "관찰 사실: 별도 Treasury 없이 mint된 KGLD 자산을 Issue 컨트랙트가 보관하는 운영 구조로 취급합니다. 추정: Issue 잔액은 발행 자산 보관 및 배포 대기 물량을 포함할 수 있습니다."
    },
    {
      level: "WATCH",
      title: "스냅샷 기반 표시",
      detail: "추정: 현재 총공급량, Issue 잔액, Redeem 잔액, 최근 거래 수치는 직전 저장 스냅샷을 그대로 표시합니다."
    }
  ],
  actions: [
    { priority: "P1", text: "다음 실행 전 Alchemy MCP 서버가 이 세션에 실제로 연결되는지 확인" },
    { priority: "P2", text: "네트워크 허용 환경에서 최근 24시간 KGLD Transfer, 발행, 소각, Issue 보관 흐름 재집계" },
    { priority: "P3", text: "Issue 컨트랙트의 발행 자산 보관 및 배포 흐름을 실시간 기준으로 다시 검증" }
  ]
};
