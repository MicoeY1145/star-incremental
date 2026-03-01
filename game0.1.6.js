console.log("game0.1.6.js 开始执行");

// 使用版本化的存储键名
const SAVE_KEY = 'starIncrementalSave_v0_1_6';

const defaultCSS = "style0.1.6.css";
const alternateCSS = "style0.1.6(2).css";
const MAX_FRAME_DT = 0.25;   // 每帧最多结算 0.25s
let offlineBacklog = 0;      // 待结算的离线时间（秒），最多一小时
let currentCSS = defaultCSS;

const newsSentences = [
    { text: "LRO是多少？", weight: 4 },
    { text: "如果发生了葛立恒数级的地震，该怎么防御呢？答案：我们只需要找到一片森林，森林里的第一颗树有一片树叶，第二棵树有三片树叶，第三棵树吗，有很多树叶，只需要把第三棵树的树叶建成建筑物就可以抵御葛立恒数级的地震", weight: 2 },
    { text: "本游戏会在0.2版本使用break_eternity.js", weight: 4 },
    { text: "如果你有空，可以试着去bilibili去搜索苊分子，那是作者的账号", weight: 3 },
    { text: "硬重置需谨慎。", weight: 5 },
    { text: "选项卡切换不自如，体验更差。", weight: 3 },
    { text: "如果你看见了这句话那么说明你看见了彩蛋！可惜我找不到彩蛋Emoji，只能给你一个蓝色的心了💙", weight: 0.00002 },
    { text: "很抱歉我们用完了增量游戏的笑话，只能让你看这句话了", weight: 2 },
    { text: "其实一个星尘是一个碳12原子", weight: 3 },
    { text: "这是一把尺子：1-2-3-4-4.7-4.8-4.85-4.875-4.8825-4.89-4.8945-4.8995-4.9（受到软上限限制）",weight: 3},
    { text: "遗忘度超过复习度，进行一次无奖励的遗忘重置",weight: 4},
    { text: "老婆买了G(64)个瑞士卷，该如何分配呢？",weight: 2},
    { text: "五小时后更新",weight: 4},
    { text: "小明平时考的都很好，但是却在挑战中拿了倒数第3，因为在挑战中",weight: 3},
    { text: "天文学家在以超光速发表论文，但是这不违反相对论，因为并没有传递任何有效信息（也就是在水论文）",weight: 3},
    { text: "/bx",weight: 3},
    { text: "版本号是0-Y吗？这么复杂。",weight: 2},
    { text: "现在科技这么发达了吗？都有K65号公路了，比葛立恒数还大！",weight: 3},
    { text: "玉米女儿问玉米妈妈：玉米爸爸在哪里？玉米妈妈说：玉米爸爸去银行爆点米花了。",weight: 3},
    { text: "红鲨在坐车回家的路上，因为速度(受二重软上限限制)、超临界折算|路程，迟迟到不了家",weight: 4},
    { text: "别以为4下少，底数2有ε0呢（OCF）",weight: 4},
]
let lastSentence = null;
//全局变量区
let recursiveProductionEnabled = false;
let attractionEnabled = false;

let transformerActive = false;
let transformerMultiplier = 1;
let transformerTimeLeft = 0;

// ============== 1. 游戏状态变量 ==============
let stardust = 0;
let stardustPerSecond = 0;
let stardustPerClick = 1;
let globalMultiplier = 1;




const STARDUST_HARD_CAP = 5e15; // 0.2 版本前的硬上限
let _reachedCapNotified = false;
function clampStardust() {
    if (stardust > STARDUST_HARD_CAP) {
        stardust = STARDUST_HARD_CAP;
        if (!_reachedCapNotified) {
            _reachedCapNotified = true;
            showNotification("已达到当前版本的星尘硬上限：5e15");
        }
    }
}
// 生产者对象

const gameProducers = {};
const stardustCondenser = gameProducers.stardustCondenser = {
    name: "星尘凝聚器",
    owned: 0,
    baseCost: 10,
    costGrowth: 1.15,
    baseProduction: 1,
    multiplier: 1,
    freeOwned: 0,
    
    get currentCost(){
        return Math.floor(this.baseCost * Math.pow(this.costGrowth, this.owned));
    },
    
    get totalProduction() {
        return (this.owned + this.freeOwned) * this.baseProduction * this.multiplier;
    }
};

const stardustCollector = gameProducers.stardustCollector = {
    name: "星尘收集器",
    owned: 0,
    baseCost: 150,
    costGrowth: 1.20,
    baseProduction: 20,
    multiplier: 1,
    freeOwned: 0,
    
    get currentCost() {
        return Math.floor(this.baseCost * Math.pow(this.costGrowth, this.owned));
    },
    
    get totalProduction() {
        return (this.owned + this.freeOwned) * this.baseProduction * this.multiplier;
    }
};
const stardustGenerater = gameProducers.stardustGenerater = {
    name: "星尘生成器",
    owned: 0,
    baseCost: 7500,
    costGrowth: 1.20,
    baseProduction: 500,
    multiplier: 1,
    freeOwned: 0,

    get currentCost(){
        return Math.floor(this.baseCost * Math.pow(this.costGrowth, this.owned));
    },

    get totalProduction() {
        return (this.owned + this.freeOwned)* this.baseProduction * this.multiplier;
    }
};

// 升级数组
const upgrades = [
    {
        id: "gravity",
        name: "引力",
        cost: 50,
        bought: false,
        effect: { type: "click", value: 5 },
        prerequisites: [],
        description:"制造引力，使更多的星尘被吸引过来。"
    },
    {
        id: "stardustcondenser1",
        name: "星尘凝聚器升级I",
        cost: 500,
        bought: false,
        effect: {
            type: "producerMultiplier",
            producer: "stardustCondenser",
            multiplier: 2
        },
        prerequisites: [],
        description:"星尘凝聚器的初级升级，使星尘凝聚器的产量增加。"
    },
    {
        id: "stardustCollector1",
        name: "星尘收集器升级I",
        cost: 2500,
        bought: false,
        effect: {
            type: "producerMultiplier",
            producer: "stardustCollector",
            multiplier: 2
        },
        prerequisites: ["stardustcondenser1"],
        description:"星尘收集器的初级升级，使星尘收集器的产量增加。"
    },
    {
        id: "stardustDilation",
        name: "星尘膨胀",
        cost: 12500,
        bought:false,
        effect:{
            type: "globalMultiplier",
            multiplier:2
        },
        prerequisites: ["stardustCollector1"],
        description:"利用时空膨胀来增加星尘的产量。"
    },
    {
        id: "stardustcondenser2",
        name: "星尘凝聚器升级II",
        cost: 50000,
        bought: false,
        effect: {
            type: "producerMultiplier",
            producer: "stardustCondenser",
            multiplier: 2
        },
        prerequisites: ["stardustDilation"],
        description:"星尘凝聚器的中级升级，使星尘凝聚器的产量增加。"
    },
    {
        id: "stardustGenerater1",
        name: "星尘生成器升级I",
        cost: 50000,
        bought: false,
        effect: {
            type: "producerMultiplier",
            producer: "stardustGenerater",
            multiplier: 2
        },
        prerequisites: ["stardustDilation"],
        description:"星尘生成器的初级升级，使星尘生成器的产量增加。"
    },
    {
        id: "recursiveProduction",
        name: "生产者辅助递归生产升级套件",
        cost: 1000000,
        bought: false,
        effect: {
            type: "recursiveProduction",
        },
        prerequisites: ["stardustGenerater1","stardustcondenser2"],
        description:"星尘收集器可以生产星尘凝聚器，星尘生成器现在可以生产星尘收集器(可能会有问题)。"
    },
    {
        id: "stardustCollector2",
        name: "星尘收集器升级II",
        cost: 75000,
        bought: false,
        effect: {
            type: "producerMultiplier",
            producer: "stardustCollector",
            multiplier: 2
        },
        prerequisites: ["stardustGenerater1"],
        description:"星尘收集器的中级升级，使星尘收集器的产量增加。"
    },
    {
        id: "stardustCondenserSuperI",
        name: "星尘凝聚器超级升级I",
        cost: 100000000000,
        bought: false,
        effect: {
          type: "producerMultiplier",
          producer: "stardustCondenser",
          multiplier: 6
        },
        prerequisites: ["recursiveProduction"],
        requireOwned: { producer: "stardustCondenser", count: 200_000_000 },
        description: "星尘凝聚器的超级升级"
      },
      {
        id: "attraction",
        name: "吸引性",
        description: "星尘膨胀现在的效果额外乘以 (1 + log10(星尘数量))",
        cost: 1e12, 
        effect: {
            type: "attraction",
        },
          prerequisites: ["stardustCondenserSuperI"],
          requireOwned: { producer: "stardustGenerater", count: 100 },
        hidden: true,
        description: "引力扭曲星尘膨胀公式。"
    },
    {
        id: "stardustTransformer",
        name: "星尘转化器",
        cost: 3e13,
        bought: false,
        effect: {
            type: "transformer"
        },
        prerequisites: ["stardustCondenserSuperI"],
        description: "将星尘转化成星尘倍率。"
    },
];


// ============== 成就系统 ==============
// 每个成就：完成后给予“所有生产器产量 ×1.15”（乘法叠加）
const ACHIEVEMENT_PROD_MULT = 1.15;
function isUpgradeBought(id) {
    const u = upgrades.find(x => x.id === id);
    return !!(u && u.bought);
  }
const achievements = [
  { id: "a_first_stardust", name: "你必须从哪里开始", req: "获得 1 星尘", unlocked: false,
    check: () => stardust >= 1 },
  { id: "a_100_stardust", name: "100个很多", req: "获得 100 星尘", unlocked: false,
    check: () => stardust >= 100 },
  { id: "a_10_condenser", name: "凝聚新手", req: "拥有 10 个星尘凝聚器", unlocked: false,
    check: () => (stardustCondenser.owned ) >= 10 },
  { id: "a_first_collector", name: "第一台收集器", req: "拥有 1 个星尘收集器", unlocked: false,
    check: () => (stardustCollector.owned) >= 1 },
  { id: "a_first_generater", name: "生成时代", req: "拥有 1 个星尘生成器", unlocked: false,
    check: () => (stardustGenerater.owned ) >= 1 },
  { id: "a_1e6_stardust", name: "百万星尘", req: "获得 1,000,000 星尘", unlocked: false,
    check: () => stardust >= 1_000_000 },
  { id: "a_200_000_000_condenser",name:"快点刷新页面！", req:"获得200，000，000星尘凝聚器", unlocked: false,
    check: () => (stardustCondenser.owned + (stardustCondenser.freeOwned || 0)) >= 200_000_000},
  { id: "a_recursive_upgrade",name:"递归的生产器",req:"购买「生产者辅助递归生产升级套件」升级",unlocked: false,
    check: () => isUpgradeBought("recursiveProduction")},
  { id: "a_attraction",name:"我因该要^3的",req:"购买「吸引性」升级",unlocked: false,
    check: () => isUpgradeBought("attraction")},
];

function getAchievementMultiplier() {
  const count = achievements.reduce((acc, a) => acc + (a.unlocked ? 1 : 0), 0);
  return Math.pow(ACHIEVEMENT_PROD_MULT, count);
}

function renderAchievements() {
  const grid = document.getElementById("achievements-grid");
  if (!grid) return;
  grid.innerHTML = "";

  achievements.forEach(a => {
    const el = document.createElement("div");
    el.className = "achievement" + (a.unlocked ? " unlocked" : "");
    el.innerHTML = `
      <div class="achievement-name">${a.name}</div>
      <div class="tooltip">要求：${a.req}\n奖励：所有生产器 ×${ACHIEVEMENT_PROD_MULT}（乘法叠加）\n状态：${a.unlocked ? "已完成" : "未完成"}</div>
    `;
    grid.appendChild(el);
  });
}

function checkAchievements() {
  let changed = false;
  for (const a of achievements) {
    if (!a.unlocked && a.check()) {
      a.unlocked = true;
      changed = true;
      showNotification(`成就完成：${a.name}（所有生产器×${ACHIEVEMENT_PROD_MULT}）`);
    }
  }
  if (changed) {
    // 成就完成会影响产量，刷新 UI 和成就展示
    stardustPerSecond = calculateSPS();
    updateUI();
    renderAchievements();
  }
}


// ============== 2. DOM 元素引用 ==============
let stardustCountEl, stardustPerSecondEl, stardustPerClickEl, clickButton;
let condenserCountEl, condenserCostEl, condenserProductionEl, buyCondenserButton;
let collectorCountEl, collectorCostEl, collectorProductionEl, buyCollectorButton;
let resetButton;
let realityPanelEl, realityCrystalCountEl, realityShardCountEl;

// ============== 3. 核心函数 ==============

// 初始化DOM引用
function initDomReferences() {
    stardustCountEl = document.getElementById('stardust-count');
    stardustPerSecondEl = document.getElementById('stardust-per-second');
    stardustPerClickEl = document.getElementById('stardust-per-click');
    clickButton = document.getElementById('click-button');
    resetButton = document.getElementById('reset-button');

    condenserCountEl = document.getElementById('condenser-count');
    condenserCostEl = document.getElementById('condenser-cost');
    condenserProductionEl = document.getElementById('condenser-production');
    buyCondenserButton = document.getElementById('buy-stardustCondenser');

    collectorCountEl = document.getElementById('collector-count');
    collectorCostEl = document.getElementById('collector-cost');
    collectorProductionEl = document.getElementById('collector-production');
    buyCollectorButton = document.getElementById('buy-stardustCollector');

    generaterCountEl = document.getElementById('generater-count');
    generaterCostEl = document.getElementById('generater-cost');
    generaterProductionEl = document.getElementById('generater-production');
    buyGeneraterButton = document.getElementById('buy-stardustGenerater');

    realityPanelEl = document.getElementById('reality-panel');
    realityCrystalCountEl = document.getElementById('reality-crystal-count');
    realityShardCountEl = document.getElementById('reality-shard-count');
    
    console.log("DOM引用初始化完成");
}

function getRandomWeightedSentence() {
    let totalWeight = 0;
    for (const sentence of newsSentences) {
        totalWeight += sentence.weight;
    }

    let randomNumber = Math.random() * totalWeight;
    let currentWeight = 0;

    for (const sentence of newsSentences) {
        currentWeight += sentence.weight;
        if (randomNumber <= currentWeight && sentence !== lastSentence) {
            lastSentence = sentence;
            return sentence.text;
        }
    }

    // 如果没有句子没选择（因该不会发生），就会随机选择句子
    const randomIndex = Math.floor(Math.random() * newsSentences.length);
    lastSentence = newsSentences[randomIndex];
    return newsSentences[randomIndex].text;
}

function updateNewsTicker() {
    const newsTicker = document.getElementById('news-ticker');
    if (!newsTicker) return;

    const sentence = getRandomWeightedSentence();
    if (!sentence) return;

    // 设置文本
    newsTicker.textContent = sentence;

    // 使用 requestAnimationFrame 等待渲染后获取宽度
    requestAnimationFrame(() => {
        const contentWidth = newsTicker.scrollWidth;

        const scrollSpeed = 65; // 每秒像素数
        const duration = (contentWidth + window.innerWidth) / scrollSpeed;

        newsTicker.style.setProperty('--content-width', contentWidth + 'px');
        newsTicker.style.setProperty('--ticker-duration', duration + 's');

        // 强制刷新动画
        newsTicker.style.animation = 'none';
        newsTicker.offsetHeight; // 强制 reflow
        newsTicker.style.animation = `ticker var(--ticker-duration) linear infinite`;
    });
}

// 更新UI显示
function updateUI() {   
    // 更新资源显示
    if (stardustCountEl) stardustCountEl.textContent = stardust.toFixed(0);
    if (stardustPerSecondEl) stardustPerSecondEl.textContent = stardustPerSecond.toFixed(1);
    if (stardustPerClickEl) stardustPerClickEl.textContent = stardustPerClick.toFixed(0);
    
    // 更新星尘凝聚器显示
    if (condenserCountEl) condenserCountEl.textContent = stardustCondenser.owned + stardustCondenser.freeOwned;
    if (condenserCostEl) condenserCostEl.textContent = stardustCondenser.currentCost.toFixed(0);
    if (condenserProductionEl) condenserProductionEl.textContent = stardustCondenser.totalProduction.toFixed(0);
    
    // 更新星尘收集器显示
    if (collectorCountEl) collectorCountEl.textContent = stardustCollector.owned + stardustCollector.freeOwned;
    if (collectorCostEl) collectorCostEl.textContent = stardustCollector.currentCost.toFixed(0);
    if (collectorProductionEl) collectorProductionEl.textContent = stardustCollector.totalProduction.toFixed(0);
    // 更新星尘收集器显示
    if (generaterCountEl) generaterCountEl.textContent = stardustGenerater.owned+ stardustGenerater.freeOwned;
    if (generaterCostEl) generaterCostEl.textContent = stardustGenerater.currentCost.toFixed(0);
    if (generaterProductionEl) generaterProductionEl.textContent = stardustGenerater.totalProduction.toFixed(0);

    // 更新升级按钮状态
    upgrades.forEach(upgrade => {
        const button = document.querySelector(`#upgrade-${upgrade.id} .buy-upgrade`);
        if (button) {
            button.disabled = upgrade.bought || stardust < upgrade.cost;
            button.textContent = upgrade.bought ? "已购买" : "购买";
            
        }
    });
    const panel = document.getElementById("transformer-panel");
    if (panel) {
        panel.style.display = isUpgradeBought("stardustTransformer") ? "block" : "none";
    }
}
    

// 渲染升级项（只显示已解锁的）
function renderUpgrades() {
    const upgradesContainer = document.getElementById('upgrades-grid');
    if (!upgradesContainer) return;
  
    upgradesContainer.innerHTML = '';
  
    upgrades.forEach(upgrade => {
      const prerequisitesMet = checkPrerequisites(upgrade);
      if (prerequisitesMet && !upgrade.bought) {
        const el = document.createElement('div');
        el.className = 'upgrade';
        el.id = `upgrade-${upgrade.id}`;
        el.innerHTML = `
          <p class="upgrade-name">${upgrade.name}</p>
          <p>${getUpgradeDescription(upgrade)}</p>
          <p>成本: <span>${upgrade.cost}</span>星尘</p>
          <button class="buy-upgrade" data-id="${upgrade.id}">购买升级</button>
        `;
        upgradesContainer.appendChild(el);
      }
    });
  }


// 获取升级描述
function getUpgradeDescription(upgrade) {
    if (upgrade.effect.type === "click") {
        return `+${upgrade.effect.value} 每次点击星尘`;
    } else if (upgrade.effect.type === "globalMultiplier") {
        return `全局产量×${upgrade.effect.multiplier}`;
    } else if (upgrade.effect.type === "producerMultiplier") {
        const producerName = 
            upgrade.effect.producer === "stardustCondenser" ? "星尘凝聚器" :
            upgrade.effect.producer === "stardustCollector" ? "星尘收集器" :
            upgrade.effect.producer === "stardustGenerater" ? "星尘生成器" :
            "未知生产者";
        return `${producerName}产量×${upgrade.effect.multiplier}`;
    } else if (upgrade.effect.type === "recursiveProduction") {
        return "星尘收集器可以生产星尘凝聚器，星尘生成器可以生产星尘收集器";
    } else if (upgrade.effect.type === "attraction") {
        return "星尘膨胀现在的效果额外乘以 (1 + log10(星尘数量))";
    } else if (upgrade.effect.type === "transformer") {
        return "消耗设定的星尘量（最少1e10）来获得log8(星尘量）秒的log2(星尘量）倍星尘获取";
    }

    return "未知效果";
}

// 检查前提条件是否满足
function checkPrerequisites(upgrade) {
    // 先检查显式前置升级
    if (upgrade.prerequisites && upgrade.prerequisites.length > 0) {
      const ok = upgrade.prerequisites.every(preReqId => {
        const pre = upgrades.find(u => u.id === preReqId);
        return pre && pre.bought === true;
      });
      if (!ok) return false;
    }
  
    // 再检查“拥有量解锁”
    if (upgrade.requireOwned) {
      const prod = gameProducers[upgrade.requireOwned.producer];
      const have = (prod?.owned || 0) + (prod?.freeOwned || 0);
      if (have < upgrade.requireOwned.count) return false;
    }
  
    return true;
  }

// 购买升级
function buyUpgrade(upgradeId) {
    const upgrade = upgrades.find(u => u.id === upgradeId);
    if (!upgrade || upgrade.bought || stardust < upgrade.cost) return;
  
    stardust -= upgrade.cost;
    upgrade.bought = true;
  
    if (upgrade.effect.type === "click") {
      stardustPerClick += upgrade.effect.value;
  
    } else if (upgrade.effect.type === "producerMultiplier") {
      const producer = gameProducers[upgrade.effect.producer];
      if (producer) producer.multiplier *= upgrade.effect.multiplier;
  
    } else if (upgrade.effect.type === "recursiveProduction") {
      recursiveProductionEnabled = true;
  
    } else if (upgrade.effect.type === "attraction") {
      attractionEnabled = true;
    }
  
    stardustPerSecond = calculateSPS();
    renderUpgrades();
    updateUI();
  }


function toggleCSS() {
    const cssLink = document.querySelector('link[rel="stylesheet"]'); 
    
    if (cssLink) {
      if (currentCSS === defaultCSS) {
        cssLink.href = alternateCSS;
        currentCSS = alternateCSS;
      } else {
        cssLink.href = defaultCSS;
        currentCSS = defaultCSS;
      }
    } else {
      console.error("CSS link element not found!");
    }
  }


function showNotification(message) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // 添加到DOM
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // 移除通知
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 3000);
}

// 计算每秒总星尘产量
function calculateSPS() {

    let sps = 0;

    sps += stardustCondenser.totalProduction || 0;
    sps += stardustCollector.totalProduction || 0;
    sps += stardustGenerater.totalProduction || 0;

    let multiplier = globalMultiplier || 1;

    if (isUpgradeBought("stardustDilation")) {
        if (attractionEnabled) {
            multiplier *= (1 + Math.log10(Math.max(stardust, 1)));
        } else {
            multiplier *= 2;
        }
    }

    let finalMultiplier = multiplier * getAchievementMultiplier();

    if (transformerActive) {
        finalMultiplier *= transformerMultiplier;
    }

    return sps * finalMultiplier;
}

// 购买生产者
function buyProducer(producer, free = false) {
    let costToUse;
    if(free){
       costToUse = 0;
    } else {
        costToUse = producer.currentCost;
    }
    if (stardust >= costToUse) {
        stardust -= costToUse;
        if(!free){
            producer.owned++;
        } else {
            producer.freeOwned++;
        }

        stardustPerSecond = calculateSPS();
        updateUI();
    }
}

function activateTransformer(amount) {

    if (!transformerUnlocked) return;

    if (amount < 1e10) {
        showNotification("最少需要 1e10 星尘");
        return;
    }

    if (stardust < amount) {
        showNotification("星尘不足");
        return;
    }

    // 消耗
    stardust -= amount;

    let log2Value = Math.log2(amount);

    transformerMultiplier = log2Value;
    transformerTimeLeft = log2Value / 3;
    transformerActive = true;

    showNotification(
        `转化启动！倍率 ×${transformerMultiplier.toFixed(2)} 持续 ${transformerTimeLeft.toFixed(2)} 秒`
    );
}
// 每次计算只处理 5 秒的离线进度
let offlineProcessingTime = 5; // 每帧最多处理5秒离线进度

function runRecursiveProduction(deltaTime) {
    if (deltaTime <= 0) return;
  
    const genToCollectorRate = 1; // 生成器 ➜ 收集器
    const colToCondenserRate = 1; // 收集器 ➜ 凝聚器
  
    // 生成器产收集器（含免费单位）
    const generatorCount = stardustGenerater.owned + (stardustGenerater.freeOwned || 0);
    const generatedCollectors =
      Math.floor(generatorCount * genToCollectorRate * stardustGenerater.multiplier * deltaTime + 1);
    if (generatedCollectors >= 1) {
      stardustCollector.freeOwned = (stardustCollector.freeOwned || 0) + generatedCollectors;
    }
  
    // 收集器产凝聚器（含免费单位）
    const collectorCount = stardustCollector.owned + (stardustCollector.freeOwned || 0);
    const generatedCondensers =
      Math.floor(collectorCount * colToCondenserRate * stardustCollector.multiplier * deltaTime + collectorCount);
    if (generatedCondensers >= 1) {
      stardustCondenser.freeOwned = (stardustCondenser.freeOwned || 0) + generatedCondensers;
    }
  }

let lastUpdateTime = Date.now();
let skipOfflineCalc = false;
let offlineDeltaTime = 0;

// 核心时间管理函数（替代旧deltaTime逻辑）
function getDeltaTime() {
    const now = Date.now();
    const rawDelta = (now - lastUpdateTime) / 1000;
    lastUpdateTime = now;
  
    const popup = document.getElementById("offline-progress-popup");
    const secEl = document.getElementById("offline-seconds");
  
    // 用户点了“跳过离线计算”
    if (skipOfflineCalc) {
      offlineDeltaTime = 0;
      if (popup) popup.style.display = "none";
      return Math.min(rawDelta, 1); // 正常实时帧
    }
  
    // 认为>10秒就是“离线归来”
    if (rawDelta > 10) {
      // 累计离线总时长
      offlineDeltaTime += rawDelta;
  
      // 展示剩余待结算秒数
      if (secEl) secEl.innerText = Math.floor(offlineDeltaTime);
      if (popup) popup.style.display = "block";
  
      // 每帧最多结算 offlineProcessingTime 秒，避免一帧吃太多卡UI
      const chunk = Math.min(offlineDeltaTime, offlineProcessingTime);
      offlineDeltaTime -= chunk;
  
      // 如果离线结算已经吃完，关闭弹窗
      if (offlineDeltaTime <= 0 && popup) {
        popup.style.display = "none";
      }
      return chunk;
    }
  
    // 正常前台帧：直接返回真实delta
    if (popup && offlineDeltaTime <= 0) popup.style.display = "none";
    return rawDelta;
  }


// 游戏主循环
function gameLoop() {
  const now = Date.now();
  const rawDelta = (now - lastUpdateTime) / 1000;
  lastUpdateTime = now;

  // 将大 delta 切块处理，避免一帧吃完卡死
  if (rawDelta > MAX_FRAME_DT) {
    // 离线积压最多保留 3600 秒，防止超长离线压垮页面
    offlineBacklog += Math.min(rawDelta - MAX_FRAME_DT, 3600);
  }

  // 本帧要处理的时间 = 实时小段 + 一小块离线积压
  let deltaTime = Math.min(rawDelta, MAX_FRAME_DT);
  const extra = Math.min(offlineBacklog, MAX_FRAME_DT);
  deltaTime += extra;
  offlineBacklog -= extra;

  if (transformerActive) {
    transformerTimeLeft -= deltaTime;

        if (transformerTimeLeft <= 0) {
            transformerActive = false;
            transformerMultiplier = 1;
            transformerTimeLeft = 0;
            showNotification("星尘转化效果结束");
        }
    }

  // 自动生产
  stardust += stardustPerSecond * deltaTime;
  clampStardust();

  // 递归生产
  if (recursiveProductionEnabled) {
    runRecursiveProduction(deltaTime);
  }

  // 本帧只更新一次 UI
  stardustPerSecond = calculateSPS();

  // 成就检测（解锁会刷新 UI）
  checkAchievements();

  checkCollections();

  updateUI();
  requestAnimationFrame(gameLoop);
}

// 保存游戏
function saveGame() {
    const saveData = {
        stardust,
        stardustPerSecond,
        stardustPerClick,
        globalMultiplier,
        lastUpdateTime: Date.now(),
        producers: {
            condenser: {
                owned: stardustCondenser.owned,
                multiplier: stardustCondenser.multiplier,
                freeOwned: stardustCondenser.freeOwned,
            },
            collector: {
                owned: stardustCollector.owned,
                multiplier: stardustCollector.multiplier,
                freeOwned: stardustCollector.freeOwned,
            },
            generater: {
                owned: stardustGenerater.owned,
                multiplier: stardustGenerater.multiplier,
                freeOwned: stardustGenerater.freeOwned,
            },
        },
        upgrades: upgrades.map(u => ({
            id: u.id,
            bought: u.bought
        })),

        recursiveProductionEnabled: recursiveProductionEnabled,
        attractionEnabled: attractionEnabled,

        achievements: achievements.map(a => ({ id: a.id, unlocked: a.unlocked })),

        collections: collections.map(c => ({
            id: c.id,
            unlocked: c.unlocked
        }))
    };

    
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
}

// 加载游戏
function loadGame() {
    const saveData = JSON.parse(localStorage.getItem(SAVE_KEY));
    
    if (saveData) {
        stardust = saveData.stardust || 0;
        stardustPerClick = saveData.stardustPerClick || 1;
        stardustPerSecond = saveData.stardustPerSecond || 0;
        globalMultiplier = saveData.globalMultiplier || 1;

        if (saveData.producers) {
            if (saveData.producers.condenser) {
                stardustCondenser.owned = saveData.producers.condenser.owned || 0;
                stardustCondenser.multiplier = saveData.producers.condenser.multiplier || 1;
                stardustCondenser.freeOwned = saveData.producers.condenser.freeOwned || 0;
            }

            if (saveData.producers.collector) {
                stardustCollector.owned = saveData.producers.collector.owned || 0;
                stardustCollector.multiplier = saveData.producers.collector.multiplier || 1;
                stardustCollector.freeOwned = saveData.producers.collector.freeOwned || 0;
            }

            if (saveData.producers.generater) {
                stardustGenerater.owned = saveData.producers.generater.owned || 0;
                stardustGenerater.multiplier = saveData.producers.generater.multiplier || 1;
                stardustGenerater.freeOwned = saveData.producers.generater.freeOwned || 0;
            }
        }

        // 加载升级状态
        if (saveData.upgrades) {
            saveData.upgrades.forEach(savedUpgrade => {
                const upgrade = upgrades.find(u => u.id === savedUpgrade.id);
                if (upgrade) {
                    upgrade.bought = savedUpgrade.bought;
                }
            });
        }
        recursiveProductionEnabled = saveData.recursiveProductionEnabled || false;
        attractionEnabled = saveData.attractionEnabled || false;

        if (saveData.achievements) {
            saveData.achievements.forEach(sa => {
                const a = achievements.find(x => x.id === sa.id);
                if (a) a.unlocked = !!sa.unlocked;
            });
        }

        if (saveData.collections) {
            saveData.collections.forEach(saved => {
                const col = collections.find(c => c.id === saved.id);
                if (col) col.unlocked = saved.unlocked;
            });
        }
        renderCollections();
        clampStardust();               
        stardustPerSecond = calculateSPS();

    }
}

// 重置游戏
function resetGame() {
    // 重置游戏状态
    stardust = 0;
    stardustPerSecond = 0;
    stardustPerClick = 1;
    globalMultiplier = 1;
    
    // 重置生产者
    stardustCondenser.owned = 0;
    stardustCondenser.multiplier = 1;
    stardustCondenser.freeOwned = 0;
    
    stardustCollector.owned = 0;
    stardustCollector.multiplier = 1;
    stardustCollector.freeOwned = 0;

    stardustGenerater.owned = 0;
    stardustGenerater.multiplier = 1;
    stardustGenerater.freeOwned = 0;
    
    // 重置升级
    upgrades.forEach(upgrade => {
        upgrade.bought = false;
    });
    recursiveProductionEnabled = false;
    attractionEnabled = false;

    achievements.forEach(a => {
        a.unlocked = false;
    });

    collections.forEach(c => {
        c.unlocked = false;
    });
    renderCollections();

    // 清除本地存储
    localStorage.removeItem(SAVE_KEY);

    
    // 更新UI
    updateUI();
    renderUpgrades();
    renderAchievements();
    
    // 显示通知
    showNotification("游戏已重置！");
}

// ============== 4. 事件监听器 ==============
function initEventListeners() {
    // 主点击按钮
    if (clickButton) {
        clickButton.addEventListener('click', () => {
            stardust += stardustPerClick;
            clampStardust();
            updateUI();
        });
    } else {
        console.error("错误：未找到点击按钮元素");
    }

    // 购买生产者
    if (buyCondenserButton) buyCondenserButton.addEventListener('click', () => {
        buyProducer(stardustCondenser);
        stardustPerSecond = calculateSPS();
    });

    if (buyCollectorButton) buyCollectorButton.addEventListener('click', () => {
        buyProducer(stardustCollector);
        stardustPerSecond = calculateSPS();
    });

    if (buyGeneraterButton) buyGeneraterButton.addEventListener('click', () => {
        buyProducer(stardustGenerater);
        stardustPerSecond = calculateSPS();
    });

    // 升级按钮事件（事件委托）
    document.addEventListener('click', (event) => {
        const t = event.target;
        if (t && t.classList && t.classList.contains('buy-upgrade')) {
            const upgradeElement = t.closest('.upgrade');
            if (upgradeElement) {
                const upgradeId = upgradeElement.id.replace('upgrade-', '');
                buyUpgrade(upgradeId);
            }
        }
    });

    // 重置按钮事件
    const resetBtn = document.getElementById('reset-button');
    if (resetBtn) resetBtn.addEventListener('click', resetGame);

    // CSS切换按钮事件
    const toggleBtn = document.getElementById('toggle-css-button');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleCSS);

    // 选项卡切换事件（事件委托）
    const tabs = document.querySelector('.tab-buttons');
    if (tabs) {
        tabs.addEventListener('click', (event) => {
            const btn = event.target;
            if (btn && btn.classList && btn.classList.contains('tab-button')) {
                const tab = btn.dataset.tab;
                openTab(tab);
            }
        });
    }

    // 离线进度跳过按钮
    const skipBtn = document.getElementById("skip-offline-button");
    if (skipBtn) {
        skipBtn.addEventListener("click", () => {
            skipOfflineCalc = true;
            const popup = document.getElementById("offline-progress-popup");
            if (popup) popup.style.display = "none";
            offlineDeltaTime = 0;
        });
    }
}



// 选项卡切换函数
function openTab(tabName) {
    // 隐藏别的选项卡内容
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));

    // 关闭其他选项卡按钮
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));

    // 激活选择的选项卡的内容
    const contentEl = document.getElementById(tabName);
    const btnEl = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
    if (contentEl) contentEl.classList.add('active');
    if (btnEl) btnEl.classList.add('active');

    // Tab-specific render
    if (tabName === 'stardust') {
        renderUpgrades();
    }
    if (tabName === 'achievements') {
        renderAchievements();
    }
}


// ============== 5. 初始化游戏 ==============

document.addEventListener('DOMContentLoaded', () => {
    // 初始化DOM引用
    initDomReferences();

    // 初始化事件监听器
    initEventListeners();

    // 加载游戏
    loadGame();

    // 渲染升级/成就
    renderUpgrades();
    renderAchievements();

    // 更新UI
    stardustPerSecond = calculateSPS();
    updateUI();

    // 启动新闻滚动系统
    updateNewsTicker();
    setInterval(updateNewsTicker, 40000);

    // 自动保存
    setInterval(saveGame, 10000);

    // 启动主循环
    requestAnimationFrame(gameLoop);
});

window.addEventListener('beforeunload', saveGame);

console.log("game0.1.5.1.js 加载完成");
console.info("这是一个彩蛋-->💙");
console.info("如果你看见了这条信息，那么说明你打开了控制台");

