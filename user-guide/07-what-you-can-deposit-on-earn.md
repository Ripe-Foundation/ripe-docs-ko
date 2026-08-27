---
description: Earn에 예치할 수 있는 자산을 비교하세요
---

# Earn에 예치할 수 있는 자산

앞선 가이드는 [GREEN LP 토큰](05-provide-liquidity.md)과 [RIPE](06-get-and-lock-ripe.md)를 다뤘습니다. 네 가지 Earn 자산은 모두 같은 방식으로 사용하므로 전체 목록을 살펴보겠습니다. 정확한 페어와 운용처는 네트워크마다 다르며, 아래 표는 스크린샷에 표시된 항목을 예시로 사용합니다.

| Earn 자산 | 무엇인가요? | 어디서 구하나요? |
| --- | --- | --- |
| **sGREEN** | [Savings GREEN](../earning-and-rewards/01-sgreen.md): 프로토콜 수익에 따라 가치가 올라가는 GREEN | 대출할 때 Receive Token을 Savings GREEN으로 설정하거나 **Get sGREEN**으로 스왑 |
| **GREEN LP** (여기서는 GREEN/USDG) | GREEN 스테이블코인 풀에서 사용자가 보유한 지분 | **Get GREEN**을 통해 LP 토큰으로 스왑하거나, **Get GREEN/USDG LP**를 눌러 Curve에서 두 자산을 예치([GREEN을 구하고 유동성 공급하기](05-provide-liquidity.md)) |
| **RIPE** | 프로토콜의 거버넌스 토큰 | **Get RIPE**를 누르거나 다른 네트워크에서 **Bridge RIPE** 사용([RIPE를 구하고 잠그기](06-get-and-lock-ripe.md)) |
| **RIPE LP** (여기서는 RIPE/WETH) | RIPE 풀에서 사용자가 보유한 지분 | Uniswap V2로 연결되는 **Get RIPE/WETH LP** 사용 |

네 가지 모두 같은 방식입니다. **Get** 링크로 토큰을 구한 다음 Ripe에 예치합니다. Get 링크는 항상 올바른 운용처를 가리키므로 사용자가 직접 풀을 찾을 필요가 없습니다. 별도로 풀을 검색해 사용하지 마세요.

내부적으로는 두 종류로 나뉩니다. RIPE와 RIPE LP는 잠금과 포인트를 다루는 거버넌스 볼트로 들어갑니다. sGREEN과 GREEN LP는 시장보다 낮은 가격으로 청산 담보를 매수하는 [안정화 풀](../earning-and-rewards/02-stability-pools.md)로 들어갑니다.

**수익률 읽는 법.** 각 자산에는 두 개의 수치가 위아래로 표시됩니다. 위쪽에는 큰 글씨의 **APY**, 아래쪽에는 **+ [수치]% Locked RIPE Rewards**가 표시됩니다. 두 수치의 의미가 다르지만 하나로 오해하기 쉽습니다.

큰 글씨의 수치는 자산 자체가 창출하는 수익입니다. 두 번째 수치는 RIPE로 지급되는 추가 보상입니다. 이 보상이 locked로 표시되는 이유는 [RIPE를 구하고 잠그기](06-get-and-lock-ripe.md#보상을-청구할-때-잠금이-적용되는-방식)에서 설명합니다. 청구량 대부분은 지갑으로 전송되지 않고 스테이킹됩니다. 큰 글씨의 수치는 바로 이용할 수 있는 수익으로, 두 번째 수치는 기다려야 하는 가치로 생각하세요.

둘 다 추정치입니다. 풀이 작을 때는 둘 다 높게 표시되고, 예치금이 늘어나면 낮아집니다.

---

_여기서 다루지 않는 항목: [청산](../core-protocol/04-liquidations.md) 실행(Liquidations 페이지는 청산을 실행하는 고급 사용자를 위한 것이며, [GREEN 대출받기](03-borrow-green.md)는 청산당하지 않는 방법을 설명합니다), [본드](../governance-and-economics/03-bonds.md), [RIPE Reserve Engine](../governance-and-economics/04-reserve-engine.md). 이 항목은 각 프로토콜 가이드에서 설명합니다._
