window.KGLD_DASHBOARD_DATA = {
  "updatedAt": "2026-07-24 09:08:07 KST",
  "period": "최근 24시간",
  "network": "Ethereum Mainnet",
  "latestBlock": 25598908,
  "status": "정상",
  "statusLevel": "normal",
  "statusMessage": "관찰 사실: 최근 24시간 KGLD Transfer 0건. 발행 0 KGLD, 소각 0 KGLD. Issue 및 Redeem 관련 신규 이동 없음. 추정: Issue 잔액은 발행 자산 보관 및 배포 대기 물량을 포함할 수 있습니다.",
  "contracts": {
    "token": "0xD1479fD673D9767E6c6E46eF6Bc640ff1F6Eb9CE",
    "issue": "0xd5A62Dd28BF16229b4Dd9687DECC233548B9AA95",
    "redeem": "0xe257fe24611CfabCa4a48869C1222D1cC2602E70"
  },
  "kpis": [
    {
      "label": "총공급량",
      "value": "1211.67492435",
      "unit": "KGLD",
      "change": "0",
      "tone": "neutral"
    },
    {
      "label": "24시간 전송",
      "value": "0",
      "unit": "건",
      "change": "0",
      "tone": "neutral"
    },
    {
      "label": "24시간 거래량",
      "value": "0",
      "unit": "KGLD",
      "change": "0",
      "tone": "neutral"
    },
    {
      "label": "발행",
      "value": "0",
      "unit": "KGLD",
      "change": "0",
      "tone": "neutral"
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
      "value": "0.00",
      "unit": "%",
      "change": "0",
      "tone": "neutral"
    }
  ],
  "balances": {
    "issue": {
      "value": 0.00363476,
      "percentage": 0,
      "change": 0
    },
    "redeem": {
      "value": 0.50082762,
      "percentage": 0.04,
      "change": 0
    },
    "circulating": {
      "value": 1211.17046197,
      "percentage": 99.95,
      "change": 0
    }
  },
  "activity": {
    "issue": {
      "inbound": 0,
      "outbound": 0,
      "count": 0,
      "note": "발행 자산 보관 및 배포 흐름 변동 없음"
    },
    "redeem": {
      "inbound": 0,
      "outbound": 0,
      "count": 0,
      "note": "상환 관련 이동 없음"
    }
  },
  "transactions": [],
  "risks": [
    {
      "level": "INFO",
      "title": "최근 24시간 전송",
      "detail": "관찰 사실: KGLD Transfer 0건, 총 0 KGLD 이동."
    },
    {
      "level": "INFO",
      "title": "Issue 보관 구조",
      "detail": "관찰 사실: Issue 컨트랙트 잔액 0.00363476 KGLD (0.00%). 추정: 발행 자산 보관 및 배포 대기 물량이 포함될 수 있습니다."
    },
    {
      "level": "INFO",
      "title": "공급량 변동",
      "detail": "관찰 사실: 최근 24시간 발행 0 KGLD, 소각 0 KGLD."
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
