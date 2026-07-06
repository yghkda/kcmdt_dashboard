window.KGLD_DASHBOARD_DATA = {
  "updatedAt": "2026-07-06 09:45:09 KST",
  "period": "최근 24시간",
  "network": "Ethereum Mainnet",
  "latestBlock": 25469985,
  "status": "데이터 제한",
  "statusLevel": "watch",
  "statusMessage": "관찰 사실: 최근 24시간 KGLD Transfer 0건. 발행 0 KGLD, 소각 0 KGLD. Transfer 이벤트 조회 제한 발생 (unavailable). 추정: 공급량과 Issue/Redeem 잔액은 최신 RPC로 갱신했지만, 최근 24시간 Transfer 활동은 Alchemy rate limit 때문에 보수적으로 미확정 처리합니다. Issue 컨트랙트가 발행 자산의 과반을 보관 중이므로 운영 배포 흐름의 집중도는 계속 관찰합니다.",
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
      "value": "확인 제한",
      "unit": "",
      "change": "0",
      "tone": "watch"
    },
    {
      "label": "24시간 거래량",
      "value": "확인 제한",
      "unit": "",
      "change": "0",
      "tone": "watch"
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
      "value": "99.94",
      "unit": "%",
      "change": "0",
      "tone": "watch"
    }
  ],
  "balances": {
    "issue": {
      "value": 1211.00263476,
      "percentage": 99.94,
      "change": 0
    },
    "redeem": {
      "value": 0.50082762,
      "percentage": 0.04,
      "change": 0
    },
    "circulating": {
      "value": 0.17146197,
      "percentage": 0.01,
      "change": 0
    }
  },
  "activity": {
    "issue": {
      "inbound": 0,
      "outbound": 0,
      "count": 0,
      "note": "Transfer 조회 제한으로 24시간 유입·유출 미확정"
    },
    "redeem": {
      "inbound": 0,
      "outbound": 0,
      "count": 0,
      "note": "Transfer 조회 제한으로 상환 관련 이동 미확정"
    }
  },
  "transactions": [],
  "risks": [
    {
      "level": "WATCH",
      "title": "Transfer 조회 제한",
      "detail": "관찰 사실: 공급량과 Issue/Redeem 잔액은 갱신됐지만 최근 24시간 Transfer 조회가 제한됐습니다. source=unavailable."
    },
    {
      "level": "WATCH",
      "title": "최근 24시간 전송",
      "detail": "관찰 사실: Transfer 이벤트 조회 제한으로 24시간 전송 수와 거래량은 미확정입니다."
    },
    {
      "level": "WATCH",
      "title": "Issue 보관 구조",
      "detail": "관찰 사실: Issue 컨트랙트 잔액 1211.00263476 KGLD (99.94%). 추정: 발행 자산 보관 및 배포 대기 물량이 포함될 수 있습니다."
    },
    {
      "level": "INFO",
      "title": "공급량 변동",
      "detail": "관찰 사실: 최근 24시간 발행 0 KGLD, 소각 0 KGLD."
    }
  ],
  "actions": [
    {
      "priority": "P0",
      "text": "Alchemy rate limit으로 Transfer 조회가 제한됨. 다음 실행에서 자동 재조회하며 필요 시 Alchemy 사용량·플랜 확인"
    },
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
