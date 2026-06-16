window.KGLD_DASHBOARD_DATA = {
  "updatedAt": "2026-06-16 13:04:52 KST",
  "period": "최근 24시간",
  "network": "Ethereum Mainnet",
  "latestBlock": 25327572,
  "status": "공급 변동",
  "statusLevel": "watch",
  "statusMessage": "관찰 사실: 최근 24시간 KGLD Transfer 1건. 발행 246 KGLD, 소각 0 KGLD. Issue 유입 246 / 유출 0 KGLD. Redeem 유입 0 / 유출 0 KGLD. 추정: Issue 컨트랙트가 발행 자산의 과반을 보관 중이어서 운영 배포 흐름 집중도가 높습니다. 최근 24시간 공급량 변동이 발생해 발행·소각 사유 점검이 필요합니다.",
  "contracts": {
    "token": "0xD1479fD673D9767E6c6E46eF6Bc640ff1F6Eb9CE",
    "issue": "0xd5A62Dd28BF16229b4Dd9687DECC233548B9AA95",
    "redeem": "0xe257fe24611CfabCa4a48869C1222D1cC2602E70"
  },
  "kpis": [
    {
      "label": "총공급량",
      "value": "247.20492435",
      "unit": "KGLD",
      "change": "0",
      "tone": "neutral"
    },
    {
      "label": "24시간 전송",
      "value": "1",
      "unit": "건",
      "change": "0",
      "tone": "watch"
    },
    {
      "label": "24시간 거래량",
      "value": "246",
      "unit": "KGLD",
      "change": "0",
      "tone": "watch"
    },
    {
      "label": "발행",
      "value": "246",
      "unit": "KGLD",
      "change": "0",
      "tone": "watch"
    },
    {
      "label": "소각",
      "value": "0",
      "unit": "KGLD",
      "change": "0",
      "tone": "neutral"
    },
    {
      "label": "Issue 보관 비중",
      "value": "99.72",
      "unit": "%",
      "change": "0",
      "tone": "watch"
    }
  ],
  "balances": {
    "issue": {
      "value": 246.53263476,
      "percentage": 99.72,
      "change": 0
    },
    "redeem": {
      "value": 0.50082762,
      "percentage": 0.2,
      "change": 0
    },
    "circulating": {
      "value": 0.17146197,
      "percentage": 0.06,
      "change": 0
    }
  },
  "activity": {
    "issue": {
      "inbound": 246,
      "outbound": 0,
      "count": 1,
      "note": "발행 자산 보관 및 배포 흐름 관찰"
    },
    "redeem": {
      "inbound": 0,
      "outbound": 0,
      "count": 0,
      "note": "상환 관련 이동 관찰"
    }
  },
  "transactions": [
    {
      "time": "2026-06-16 12:14:47 KST",
      "type": "mint",
      "from": "0x0000000000000000000000000000000000000000",
      "to": "0xd5a62dd28bf16229b4dd9687decc233548b9aa95",
      "amount": "246",
      "hash": "0x571a56257aed82d1098d2f773d1b7f391514837495abf0ae87fb0365b6539a76"
    }
  ],
  "risks": [
    {
      "level": "WATCH",
      "title": "최근 24시간 전송",
      "detail": "관찰 사실: KGLD Transfer 1건, 총 246 KGLD 이동."
    },
    {
      "level": "WATCH",
      "title": "Issue 보관 구조",
      "detail": "관찰 사실: Issue 컨트랙트 잔액 246.53263476 KGLD (99.72%). 추정: 발행 자산 보관 및 배포 대기 물량이 포함될 수 있습니다."
    },
    {
      "level": "WATCH",
      "title": "공급량 변동",
      "detail": "관찰 사실: 최근 24시간 발행 246 KGLD, 소각 0 KGLD."
    }
  ],
  "actions": [
    {
      "priority": "P1",
      "text": "Issue 컨트랙트의 보관 잔액과 외부 배포 흐름을 함께 추적"
    },
    {
      "priority": "P2",
      "text": "발행 또는 소각이 발생한 날에는 관련 트랜잭션 해시와 운영 사유를 대조"
    },
    {
      "priority": "P3",
      "text": "Redeem 유입·유출이 늘어날 경우 상환 수요 변화와 공급량 변동을 함께 점검"
    }
  ]
};
