---
description: 주식 토큰과 다른 담보를 예치해 하나의 대출을 뒷받침하세요
---

# 주식 토큰 예치하기

Borrow 페이지에 예치한 모든 자산은 하나의 대출을 위한 [담보](../core-protocol/03-collateral-assets.md)가 됩니다. 주식 토큰, WETH, 그 밖에 해당 네트워크가 지원하는 자산이 모두 같은 포지션에 들어갑니다.

**1단계.** [app.ripe.finance](https://app.ripe.finance)로 이동해 네트워크를 선택한 다음, 오른쪽 위의 **Connect Wallet**을 누르세요.

**2단계.** 왼쪽 메뉴에서 **Borrow** 페이지를 여세요. 해당 네트워크에서 예치할 수 있는 모든 자산과 각각의 조건이 표에 표시됩니다.

![한 배포 네트워크에서 촬영한 담보 표가 있는 Borrow 페이지. 사용 중인 네트워크의 자산은 다를 수 있습니다](../.gitbook/assets/user-guide-02-borrow-page.png)

**3단계.** 보유한 자산을 찾아 해당 행의 **+**를 누르세요. **Available in Wallet** 열에 지갑 잔액이 표시됩니다.

![지갑 잔액이 표시된 예치 창](../.gitbook/assets/user-guide-05-deposit-modal.png)

**4단계.** 수량을 입력하세요. 토큰을 처음 예치하면 지갑에서 **Approve**를 요청합니다. 지금 예치할 수량에 대한 사용 권한입니다. 승인한 뒤 예치 거래를 확인하세요. 나중에 더 큰 금액을 예치하면 다시 승인을 요청할 수 있습니다.

**5단계.** 완료되었습니다. 예치한 수량이 **Your Deposits** 열에 표시되고, 페이지 위쪽 패널의 합계가 업데이트됩니다.

여기서 **Your Total Deposits**와 **Your Total Collateral**이 다를 수 있습니다. 대출 한도(0보다 큰 LTV)가 있는 자산만 대출 가능 금액을 늘립니다. sGREEN, LP 토큰, RIPE 같은 Earn 포지션은 늘리지 않습니다. 그렇다고 안정화 풀에 있는 sGREEN과 GREEN LP가 대출과 완전히 분리된 것은 아닙니다. 포지션을 구해야 할 때 [디레버리지](../core-protocol/05-deleverage.md)가 먼저 사용하는 자산이 바로 이 둘입니다. 잠긴 RIPE는 건드리지 않습니다. 어떤 자산이 담보로 인정되는지는 Borrow 표에서 실시간으로 확인하세요.

![예치 후의 포지션](../.gitbook/assets/user-guide-06-position-dashboard.png)

지원되는 자산은 원하는 만큼 예치할 수 있습니다. 대출 한도가 있는 자산은 모두 [하나의 대출](../core-protocol/02-borrowing.md)에 기여하고, 주식 토큰은 예치된 동안에도 상승 여력을 그대로 유지합니다. 자세한 내용은 [Ripe의 주식 토큰](../core-protocol/00-stock-tokens.md)을 참조하세요.

다음: [GREEN 대출받기](03-borrow-green.md).
