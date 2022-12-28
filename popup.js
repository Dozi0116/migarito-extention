document.getElementById("btn").addEventListener("click", async () => {
  const [tab]     = await chrome.tabs.query({ active: true, currentWindow: true });
  const limit     = Number(document.getElementById('limit').value) || 10000;
  const minMergin = Number(document.getElementById('min-mergin').value) || 1.1;
  const flatOdds  = Number(document.getElementById('flat-odds').value) || 2;

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: onRun,
    args: [limit, minMergin, flatOdds],
  });
});

function onRun(limit, minMergin, flatOdds) {
  // variables
  const oddsList = [];
  const buyNums  = [];

  const MIN_BUY = 100;

  const numToOdds = {};

  let totalBuyAmount   = 0;
  const numToBuyAmount = {};
  const numToGetAmount = {};

  // functions
  function buy(num, amount) {
    totalBuyAmount      += amount;
    numToBuyAmount[num] += amount;
    numToGetAmount[num] += amount * numToOdds[num];
  }

  function isPlus(num) {
    return numToGetAmount[num] > (totalBuyAmount * minMergin);
  }

  function isTotalPlus() {
    return Object.keys(numToGetAmount).every((num) => {
      return isPlus(num);
    });
  }

  function getMaxOdds() {
    return Math.max(...Object.values(numToGetAmount)) / totalBuyAmount;
  }

  function currentOdds(num) {
    return numToGetAmount[num] / totalBuyAmount;
  }

  function isFlatOdds(num) {
    return (getMaxOdds() - currentOdds(num)) < flatOdds;
  }

  function isTotalFlatOdds() {
    return Object.keys(numToGetAmount).every((num) => {
      return isFlatOdds(num);
    })
  }

  function printResult(message) {
    const buyAmountMessages = [];
    Object.keys(numToBuyAmount).forEach((num) => {
      const multiplyer = numToGetAmount[num] / totalBuyAmount;
      buyAmountMessages.push(
        `${num}番: ${numToBuyAmount[num]}円 -> ${Math.floor(numToGetAmount[num])}円 (推定: ${multiplyer.toFixed(1)}倍)`
      );
    });

    alert(`${message}\n必要金額: ${totalBuyAmount} 円\n\n${buyAmountMessages.join('\n')}`);
  }

  function setOddsAndBuyNum() {
    const raceTableArea = document.getElementsByClassName('RaceTableArea')[0];
    const rows          = Array.from(raceTableArea.children[0].children[1].children);
  
    rows.forEach((row, index) => {
      const num = index + 1;
      oddsList.push(Number(document.getElementById(`odds-1_${num.toString().padStart(2, '0')}`).innerHTML));
      if (row.className !== 'HorseList') buyNums.push(num);
    });
  }

  // code
  setOddsAndBuyNum();

  // initialize
  oddsList.forEach((odds, index) => { numToOdds[index + 1] = odds });
  buyNums.forEach((num) => { numToBuyAmount[num] = 0 });
  buyNums.forEach((num) => { numToGetAmount[num] = 0 });
  buyNums.forEach((num) => { buy(num, MIN_BUY) });

  while (!(isTotalPlus() && isTotalFlatOdds()) && totalBuyAmount < limit) {
    buyNums.forEach((num) => {
      if (!(isPlus(num) && isFlatOdds(num))) {
        buy(num, MIN_BUY);
      }
    });
  }

  if (isTotalPlus() && totalBuyAmount >= limit) {
    printResult('当選時のムラが大きいですが、購入可能です！');
  } else if (totalBuyAmount >= limit) {
    printResult('この組み合わせでは厳しいようです…');
  } else {
    printResult('購入可能です！');
  }
}
