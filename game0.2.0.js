console.log("game0.1.6.js 开始执行");

// 使用版本化的存储键名
const SAVE_KEY = 'starIncrementalSave_v0_1_6';
const SAVE_EXPORT_PREFIX = 'STAR_INCREMENTAL_SAVE_V0.2.0:';

const defaultCSS = "style0.1.6.css";
const alternateCSS = "style0.1.6(2).css";
const MAX_FRAME_DT = 0.25;   // 每帧最多结算 0.25s
let offlineBacklog = 0;      // 待结算的离线时间（秒），最多一小时
let blockAutoSave = false;

// ============== break_eternity.js 数值工具 ==============
// 需要在 HTML 中先加载 break_eternity.js。
const D = (value) => (value instanceof Decimal ? value : new Decimal(value ?? 0));
const ZERO = D(0);
const ONE = D(1);

// ============== 统一 Decimal 运算封装 ==============
function add(...args) {
    return args.reduce((acc, value) => D(acc).plus(D(value)), D(0));
}

function mult(...args) {
    return args.reduce((acc, value) => D(acc).times(D(value)), D(1));
}

function sub(a, ...args) {
    return args.reduce((acc, value) => D(acc).minus(D(value)), D(a));
}

function div(a, ...args) {
    return args.reduce((acc, value) => D(acc).div(D(value)), D(a));
}

function exp(a, b) {
    return D(a).pow(D(b));
}

function log(a, b) {
    const value = D(a);
    const base = D(b);
    if (typeof value.log === 'function') return D(value.log(base));
    if (typeof Decimal.log === 'function') return D(Decimal.log(value, base));
    return D(Math.log(value.toNumber()) / Math.log(base.toNumber()));
}

const NOTATION_KEY = 'starIncrementalNotation_v0_2_0';
const notationNames = {
    scientific: '科学计数法',
    engineering: '工程计数法',
    standard: '标准后缀',
    mixed: '混合科学',
    letters: '字母后缀'
};
let currentNotation = localStorage.getItem(NOTATION_KEY) || 'scientific';

function dcmp(a, op, b) {
    a = D(a); b = D(b);
    if (op === 'gte') return a.gte(b);
    if (op === 'gt') return a.gt(b);
    if (op === 'lte') return a.lte(b);
    if (op === 'lt') return a.lt(b);
    return a.eq(b);
}
function dLog10(x) {
    x = D(x);
    if (typeof x.log10 === 'function') return D(x.log10());
    if (typeof Decimal.log10 === 'function') return D(Decimal.log10(x));
    return D(Math.log10(x.toNumber()));
}
function dLogBase(x, base) {
    x = D(x);
    if (typeof x.log === 'function') return D(x.log(base));
    if (typeof x.log10 === 'function') return div(D(x.log10()), Math.log10(base));
    return D(Math.log(x.toNumber()) / Math.log(base));
}
function safeToNumber(x) {
    x = D(x);
    const n = x.toNumber();
    return Number.isFinite(n) ? n : Infinity;
}
function trimTrailingDecimalZeros(text) {
    // 只删除小数部分末尾的 0，不能删除整数末尾的 0。
    // 例如：10 -> 10，10.00 -> 10，10.50 -> 10.5。
    return String(text).replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
}
function formatSmallNumber(n, places = 2) {
    if (!Number.isFinite(n)) return String(n);
    if (Math.abs(n) >= 1000) return n.toFixed(0);
    if (Math.abs(n) >= 100) return trimTrailingDecimalZeros(n.toFixed(1));
    return trimTrailingDecimalZeros(n.toFixed(places));
}
function letterSuffix(index) {
    let n = Math.max(0, Math.floor(index));
    let s = '';
    do {
        s = String.fromCharCode(97 + (n % 26)) + s;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return s;
}
function formatDecimal(value, places = 2) {
    let x = D(value);
    if (!x.isFinite()) return x.toString();
    if (x.lt(0)) return '-' + formatDecimal(x.neg(), places);
    if (x.lt(1000)) return trimTrailingDecimalZeros(x.toNumber().toFixed(places));
    if (x.lt(1e6)) return x.toNumber().toFixed(0);

    const log10 = dLog10(x);
    const log10Num = safeToNumber(log10);
    if (!Number.isFinite(log10Num) || log10Num > 1e6) {
        return 'e' + formatDecimal(log10, places);
    }

    if (currentNotation === 'mixed' && log10Num < 33) {
        return x.toNumber().toLocaleString('en-US', { maximumFractionDigits: 0 });
    }

    if (currentNotation === 'engineering' || currentNotation === 'standard' || currentNotation === 'letters') {
        const engExp = Math.floor(log10Num / 3) * 3;
        const mant = Math.pow(10, log10Num - engExp);
        if (currentNotation === 'engineering') return `${formatSmallNumber(mant, places)}e${engExp}`;
        const tier = engExp / 3;
        const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
        if (currentNotation === 'standard' && tier < suffixes.length) return `${formatSmallNumber(mant, places)}${suffixes[tier]}`;
        if (currentNotation === 'letters') return `${formatSmallNumber(mant, places)}${letterSuffix(tier - 1)}`;
        return `${formatSmallNumber(mant, places)}e${engExp}`;
    }

    const exp = Math.floor(log10Num);
    const mant = Math.pow(10, log10Num - exp);
    return `${formatSmallNumber(mant, places)}e${exp}`;
}
function parseDecimalInput(text) {
    try {
        const value = D(String(text).trim());
        return value.isFinite() ? value : null;
    } catch (e) {
        return null;
    }
}
function getProducerAmount(producer) {
    return add(producer.owned, producer.freeOwned || 0);
}
function setNotation(notation) {
    if (!notationNames[notation]) return;
    currentNotation = notation;
    localStorage.setItem(NOTATION_KEY, notation);
    updateUI();
}

let currentCSS = defaultCSS;

const newsSentences = [
    { text: "LRO是多少？", weight: 4 },
    { text: "如果发生了葛立恒数级的地震，该怎么防御呢？答案：我们只需要找到一片森林，森林里的第一颗树有一片树叶，第二棵树有三片树叶，第三棵树吗，有很多树叶，只需要把第三棵树的树叶建成建筑物就可以抵御葛立恒数级的地震", weight: 2 },
    { text: "我们更新啦！", weight: 4 },
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
    { text: "别以为4很少，底数2有ε0呢（OCF）",weight: 4},
    { text: "我们只需要一个更大的粒子加速器，bro，我们只需要一个更大的粒子加速器，求求你了，我们只需要一个更大的粒子加速器……",weight: 3},
    { text: "滚动新闻其实是滚木新闻<--什么新闻啊？怎么只有两个空白",weight: 1},
    { text: "发散是反时间墙，时间墙是反发散，既不发散也不时间墙是正常，既发散又时间墙是作者故意为之的",weight: 2},
    { text: "一BUG落，万BUG生。",weight: 3},
]
let lastSentence = null;
//全局变量区
let recursiveProductionEnabled = false;
let attractionEnabled = false;

let transformerActive = false;
let transformerMultiplier = D(1);
let transformerTimeLeft = D(0);

// ============== 1. 游戏状态变量 ==============
let stardust = D(0);
let stardustPerSecond = D(0);
let stardustPerClick = D(1);
let globalMultiplier = D(1);




const STARDUST_HARD_CAP = D("1e308"); // break_eternity 版本后的软硬上限（基本够当前内容使用）
let _reachedCapNotified = false;
function clampStardust() {
    if (stardust.gt(STARDUST_HARD_CAP)) {
        stardust = D(STARDUST_HARD_CAP);
        if (!_reachedCapNotified) {
            _reachedCapNotified = true;
            showNotification("已达到当前版本的星尘硬上限：" + formatDecimal(STARDUST_HARD_CAP));
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
        return mult(this.baseCost, exp(this.costGrowth, this.owned)).floor();
    },
    
    get totalProduction() {
        return mult(getProducerAmount(this), this.baseProduction, this.multiplier);
    }
};

const stardustCollector = gameProducers.stardustCollector = {
    name: "星尘收集器",
    owned: 0,
    baseCost: 150,
    costGrowth: 1.20,
    baseProduction: 25,
    multiplier: 1,
    freeOwned: 0,
    
    get currentCost() {
        return mult(this.baseCost, exp(this.costGrowth, this.owned)).floor();
    },
    
    get totalProduction() {
        return mult(getProducerAmount(this), this.baseProduction, this.multiplier);
    }
};
const stardustGenerater = gameProducers.stardustGenerater = {
    name: "星尘生成器",
    owned: 0,
    baseCost: 7500,
    costGrowth: 1.20,
    baseProduction: 1000,
    multiplier: 1,
    freeOwned: 0,

    get currentCost(){
        return mult(this.baseCost, exp(this.costGrowth, this.owned)).floor();
    },

    get totalProduction() {
        return mult(getProducerAmount(this), this.baseProduction, this.multiplier);
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
        id: "stardustGenerater2",
        name: "星尘生成器升级II",
        cost: 87500,
        bought: false,
        effect: {
            type: "producerMultiplier",
            producer: "stardustGenerater",
            multiplier: 2
        },
        prerequisites: ["stardustGenerater1"],
        description:"星尘生成器的中级升级，使星尘生成器的产量增加。"
    },
    {
        id: "stardustcondenser3",
        name: "星尘凝聚器升级III",
        cost: 1e10,
        bought: false,
        effect: {
            type: "producerMultiplier",
            producer: "stardustCondenser",
            multiplier: 2
        },
        prerequisites: ["recursiveProduction"],
        description:"星尘凝聚器的高级升级，使星尘凝聚器的产量增加。"
    },
    {
        id: "stardustCondenserSuperI",
        name: "星尘凝聚器超级升级I",
        cost: 1e11,
        bought: false,
        effect: {
          type: "producerMultiplier",
          producer: "stardustCondenser",
          multiplier: 6
        },
        prerequisites: ["recursiveProduction","stardustGenerater2","stardustcondenser3"],
        requireOwned: { producer: "stardustCondenser", count: 2e8 },
        description: "星尘凝聚器的超级升级"
      },
      {
        id: "attraction",
        name: "吸引性",
        description: "星尘膨胀现在的效果额外乘以 (1 + log10(星尘数量))",
        cost: 1e12,
        bought:false, 
        effect: {
            type: "attraction",
        },
          prerequisites: ["stardustCondenserSuperI"],
          requireOwned: { producer: "stardustGenerater", count: 100 },
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
    {
        id: "stardustTripler",
        name: "星尘3倍器",
        cost: 9e15,
        bought:false,
        effect:{
            type: "globalMultiplier",
            multiplier:3
        },
        prerequisites: ["attraction"],
        description:"我们发现了一种能批量制造星尘倍率升级的方法，但是目前还在实验阶段，这是我们做出来的测试品"
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
    check: () => stardust.gte(1) },
  { id: "a_100_stardust", name: "100个很多", req: "获得 100 星尘", unlocked: false,
    check: () => stardust.gte(100) },
  { id: "a_10_condenser", name: "凝聚新手", req: "拥有 10 个星尘凝聚器", unlocked: false,
    check: () => (stardustCondenser.owned ) >= 10 },
  { id: "a_first_collector", name: "第一台收集器", req: "拥有 1 个星尘收集器", unlocked: false,
    check: () => (stardustCollector.owned) >= 1 },
  { id: "a_first_generater", name: "生成时代", req: "拥有 1 个星尘生成器", unlocked: false,
    check: () => (stardustGenerater.owned ) >= 1 },
  { id: "a_1e6_stardust", name: "百万星尘", req: "获得 1,000,000 星尘", unlocked: false,
    check: () => stardust.gte(1_000_000) },
  { id: "a_200_000_000_condenser",name:"快点刷新页面！", req:"获得200，000，000(2e8)星尘凝聚器", unlocked: false,
    check: () => getProducerAmount(stardustCondenser).gte(200_000_000)},
  { id: "a_recursive_upgrade",name:"递归的生产器",req:"购买「生产者辅助递归生产升级套件」升级",unlocked: false,
    check: () => isUpgradeBought("recursiveProduction")},
  { id: "a_attraction",name:"我因该要^3的",req:"购买「吸引性」升级",unlocked: false,
    check: () => isUpgradeBought("attraction")},
  { id: "a_stardustTripler",name:"玩从细胞到奇点玩的",req:"购买「星尘三倍器」升级",unlocked: false,
    check: () => isUpgradeBought("stardustTripler")},
];

function getAchievementMultiplier() {
  const count = achievements.reduce((acc, a) => acc + (a.unlocked ? 1 : 0), 0);
  return exp(ACHIEVEMENT_PROD_MULT, count);
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
    if (stardustCountEl) stardustCountEl.textContent = formatDecimal(stardust);
    if (stardustPerSecondEl) stardustPerSecondEl.textContent = formatDecimal(stardustPerSecond);
    if (stardustPerClickEl) stardustPerClickEl.textContent = formatDecimal(stardustPerClick);
    
    // 更新星尘凝聚器显示
    if (condenserCountEl) condenserCountEl.textContent = formatDecimal(getProducerAmount(stardustCondenser), 0);
    if (condenserCostEl) condenserCostEl.textContent = formatDecimal(stardustCondenser.currentCost);
    if (condenserProductionEl) condenserProductionEl.textContent = formatDecimal(stardustCondenser.totalProduction);
    
    // 更新星尘收集器显示
    if (collectorCountEl) collectorCountEl.textContent = formatDecimal(getProducerAmount(stardustCollector), 0);
    if (collectorCostEl) collectorCostEl.textContent = formatDecimal(stardustCollector.currentCost);
    if (collectorProductionEl) collectorProductionEl.textContent = formatDecimal(stardustCollector.totalProduction);
    // 更新星尘收集器显示
    if (generaterCountEl) generaterCountEl.textContent = formatDecimal(getProducerAmount(stardustGenerater), 0);
    if (generaterCostEl) generaterCostEl.textContent = formatDecimal(stardustGenerater.currentCost);
    if (generaterProductionEl) generaterProductionEl.textContent = formatDecimal(stardustGenerater.totalProduction);

    // 更新升级按钮状态
    upgrades.forEach(upgrade => {
        const button = document.querySelector(`#upgrade-${upgrade.id} .buy-upgrade`);
        if (button) {
            button.disabled = upgrade.bought || stardust.lt(upgrade.cost);
            button.textContent = upgrade.bought ? "已购买" : "购买";
            
        }
    });
    const panel = document.getElementById("transformer-panel");
    if (panel) {
        panel.style.display = isUpgradeBought("stardustTransformer") ? "block" : "none";
    }
    const statusEl = document.getElementById("transformer-status");
    if (statusEl) {
        if (transformerActive) {
            statusEl.textContent =
            `当前效果：×${formatDecimal(transformerMultiplier)}，剩余 ${formatDecimal(transformerTimeLeft)} 秒`;
        } else if (isUpgradeBought("stardustTransformer")) {
            statusEl.textContent = "当前未激活";
        } else {
            statusEl.textContent = "";
        }
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
          <p>成本: <span>${formatDecimal(upgrade.cost)}</span>星尘</p>
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
      const have = add((prod?.owned || 0) , (prod?.freeOwned || 0));
      if (D(have).lt(upgrade.requireOwned.count)) return false;
    }
  
    return true;
  }

// 购买升级
function buyUpgrade(upgradeId) {
    const upgrade = upgrades.find(u => u.id === upgradeId);
    if (!upgrade || upgrade.bought || stardust.lt(upgrade.cost)) return;
  
    stardust = sub(stardust, upgrade.cost);
    upgrade.bought = true;
  
    if (upgrade.effect.type === "click") {
      stardustPerClick = add(stardustPerClick, upgrade.effect.value);
  
    } else if (upgrade.effect.type === "producerMultiplier") {
      const producer = gameProducers[upgrade.effect.producer];
      if (producer) producer.multiplier = mult(producer.multiplier,upgrade.effect.multiplier);
  
    } else if (upgrade.effect.type === "recursiveProduction") {
      recursiveProductionEnabled = true;
  
    } else if (upgrade.effect.type === "attraction") {
      attractionEnabled = true;

    } else if (
        upgrade.effect.type === "globalMultiplier" &&
        upgrade.id !== "stardustDilation"

    ) {
        globalMultiplier = mult(
            globalMultiplier,
            upgrade.effect.multiplier
        );}
  
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

    let sps = D(0);

    sps = add(sps, stardustCondenser.totalProduction || 0);
    sps = add(sps, stardustCollector.totalProduction || 0);
    sps = add(sps, stardustGenerater.totalProduction || 0);

    let multiplier = D(globalMultiplier || 1);

    if (isUpgradeBought("stardustDilation")) {
        if (attractionEnabled) {
            multiplier = mult(multiplier, add(1, dLog10(stardust.gt(1) ? stardust : ONE)));
        } else {
            multiplier = mult(multiplier, 2);
        }
    }

    let finalMultiplier = mult(multiplier, getAchievementMultiplier());

    if (transformerActive) {
        finalMultiplier = mult(finalMultiplier, transformerMultiplier);
    }

    return mult(sps, finalMultiplier);
}

// 购买生产者
function buyProducer(producer, free = false) {
    let costToUse;
    if(free){
       costToUse = 0;
    } else {
        costToUse = producer.currentCost;
    }
    if (stardust.gte(costToUse)) {
        stardust = sub(stardust, costToUse);
        if(!free){
            producer.owned = add(producer.owned, 1);
        } else {
            producer.freeOwned = add(producer.freeOwned, 1);
        }

        stardustPerSecond = calculateSPS();
        updateUI()
    }
}

function activateTransformer(amount) {
    if (!isUpgradeBought("stardustTransformer")) return;

    amount = D(amount);
    if (!amount.isFinite()) {
        showNotification("请输入有效的星尘数值");
        return;
    }

    if (amount.lt(1e10)) {
        showNotification("最少需要 1e10 星尘");
        return;
    }

    if (stardust.lt(amount)) {
        showNotification("星尘不足");
        return;
    }

    stardust = sub(stardust, amount);

    const log2Value = dLogBase(amount, 2);

    transformerMultiplier = log2Value;
    transformerTimeLeft = div(log2Value, 3);
    transformerActive = true;

    showNotification(
        `转化启动！倍率 ×${formatDecimal(transformerMultiplier)} 持续 ${formatDecimal(transformerTimeLeft)} 秒`
    );

    stardustPerSecond = calculateSPS();
    updateUI();
}

function activateTransformerFromInput() {
    const input = document.getElementById('transformer-input');
    const amount = parseDecimalInput(input ? input.value : '');
    if (!amount) {
        showNotification('请输入有效的星尘数值');
        return;
    }
    activateTransformer(amount);
}

// 每次计算只处理 5 秒的离线进度
let offlineProcessingTime = 5; // 每帧最多处理5秒离线进度
let collectorProductionBuffer = D(0);
let condenserProductionBuffer = D(0);
function runRecursiveProduction(deltaTime) {
    const dt = D(deltaTime);

    if (dt.lte(0)) return;

    const generatedCollectors = mult(
        getProducerAmount(stardustGenerater),
        stardustGenerater.multiplier,
        dt
    );

    collectorProductionBuffer = add(
        collectorProductionBuffer,
        generatedCollectors
    );

    const wholeCollectors = collectorProductionBuffer.floor();

    if (wholeCollectors.gte(1)) {
        stardustCollector.freeOwned = add(
            stardustCollector.freeOwned,
            wholeCollectors
        );

        collectorProductionBuffer = sub(
            collectorProductionBuffer,
            wholeCollectors
        );
    }

    const generatedCondensers = mult(
        getProducerAmount(stardustCollector),
        stardustCollector.multiplier,
        dt
    );

    condenserProductionBuffer = add(
        condenserProductionBuffer,
        generatedCondensers
    );

    const wholeCondensers = condenserProductionBuffer.floor();

    if (wholeCondensers.gte(1)) {
        stardustCondenser.freeOwned = add(
            stardustCondenser.freeOwned,
            wholeCondensers
        );

        condenserProductionBuffer = sub(
            condenserProductionBuffer,
            wholeCondensers
        );
    }
}

let lastUpdateTime = Date.now();
let skipOfflineCalc = false;
let offlineDeltaTime = 0;



  //让升级的函数自动检查
  let upgradeRenderTimer = 0;


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
    transformerTimeLeft = sub(transformerTimeLeft, deltaTime);

        if (D(transformerTimeLeft).lte(0)) {
            transformerActive = false;
            transformerMultiplier = D(1);
            transformerTimeLeft = D(0);
            showNotification("星尘转化效果结束");
        }
    }

    upgradeRenderTimer += deltaTime;

    if (upgradeRenderTimer >= 0.5) {
        upgradeRenderTimer = 0;
        renderUpgrades();
    }

  // 自动生产
  stardust = add(stardust, mult(stardustPerSecond, deltaTime));
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
    // 导入存档并刷新页面时，禁止旧状态覆盖新存档
    if (blockAutoSave) {
        return;
    }

    const saveData = {
        saveVersion: '0.2.0',
        exportedAt: Date.now(),
        stardust: stardust.toString(),
        stardustPerSecond: stardustPerSecond.toString(),
        stardustPerClick: stardustPerClick.toString(),
        globalMultiplier: globalMultiplier.toString(),
        lastUpdateTime: Date.now(),
        producers: {
            condenser: {
                owned: D(stardustCondenser.owned).toString(),
                multiplier: D(stardustCondenser.multiplier).toString(),
                freeOwned: D(stardustCondenser.freeOwned).toString(),
            },
            collector: {
                owned: D(stardustCollector.owned).toString(),
                multiplier: D(stardustCollector.multiplier).toString(),
                freeOwned: D(stardustCollector.freeOwned).toString(),
            },
            generater: {
                owned: D(stardustGenerater.owned).toString(),
                multiplier: D(stardustGenerater.multiplier).toString(),
                freeOwned: D(stardustGenerater.freeOwned).toString(),
            },
        },
        upgrades: upgrades.map(u => ({
            id: u.id,
            bought: u.bought
        })),

        transformer: {
            active: transformerActive,
            multiplier: transformerMultiplier.toString(),
            timeLeft: transformerTimeLeft.toString()
        },

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

// 将 Unicode 字符串安全地编码为 Base64
function encodeSaveText(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }

    return btoa(binary);
}

// 将 Base64 安全地解码为 Unicode 字符串
function decodeSaveText(base64Text) {
    const binary = atob(base64Text);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return new TextDecoder().decode(bytes);
}

function isValidImportedSave(saveData) {
    if (!saveData || typeof saveData !== 'object' || Array.isArray(saveData)) {
        return false;
    }

    // 保持对旧版本存档的兼容，但至少要求存在核心字段。
    return Object.prototype.hasOwnProperty.call(saveData, 'stardust') &&
        saveData.producers &&
        typeof saveData.producers === 'object' &&
        Array.isArray(saveData.upgrades);
}

function exportSave() {
    try {
        saveGame();
        const rawSave = localStorage.getItem(SAVE_KEY);

        if (!rawSave) {
            throw new Error('没有找到可导出的存档');
        }

        const exportedText = SAVE_EXPORT_PREFIX + encodeSaveText(rawSave);
        const textarea = document.getElementById('save-data-textarea');

        if (textarea) {
            textarea.value = exportedText;
            textarea.focus();
            textarea.select();
        }

        copySaveText(false);
        showNotification('存档已导出并尝试复制到剪贴板');
    } catch (error) {
        console.error('导出存档失败：', error);
        showNotification('导出失败：' + error.message);
    }
}

async function copySaveText(showSuccess = true) {
    const textarea = document.getElementById('save-data-textarea');
    const text = textarea ? textarea.value.trim() : '';

    if (!text) {
        if (showSuccess) showNotification('没有可复制的存档文本');
        return false;
    }

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            textarea.focus();
            textarea.select();
            const copied = document.execCommand('copy');
            if (!copied) throw new Error('浏览器拒绝复制');
        }

        if (showSuccess) showNotification('存档已复制到剪贴板');
        return true;
    } catch (error) {
        console.warn('自动复制失败：', error);
        if (showSuccess) showNotification('自动复制失败，请手动复制文本框内容');
        return false;
    }
}

function importSave() {
    const textarea = document.getElementById('save-data-textarea');
    let importedText = textarea ? textarea.value.trim() : '';

    if (!importedText) {
        showNotification('请先粘贴存档文本');
        return;
    }

    try {
        // 允许用户粘贴时带有换行或空格。
        importedText = importedText.replace(/\s+/g, '');

        let jsonText;
        if (importedText.startsWith(SAVE_EXPORT_PREFIX)) {
            jsonText = decodeSaveText(importedText.slice(SAVE_EXPORT_PREFIX.length));
        } else if (importedText.startsWith('{')) {
            // 兼容直接粘贴原始 JSON 存档。
            jsonText = importedText;
        } else {
            // 兼容没有版本前缀的 Base64 存档。
            jsonText = decodeSaveText(importedText);
        }

        const saveData = JSON.parse(jsonText);
        if (!isValidImportedSave(saveData)) {
            throw new Error('存档缺少必要字段');
        }

        const shouldImport = window.confirm(
            '导入存档会覆盖当前游戏进度。确定继续吗？'
        );
        if (!shouldImport) return;

        blockAutoSave = true;
        // 写入导入的存档
        localStorage.setItem(
        SAVE_KEY,
        JSON.stringify(saveData)
        );

        // 刷新后由 loadGame() 读取导入存档
        window.location.reload();
    } catch (error) {
        console.error('导入存档失败：', error);
        showNotification('导入失败：存档格式错误或内容已损坏');
    }
}

// 加载游戏
function loadGame() {
    const saveData = JSON.parse(localStorage.getItem(SAVE_KEY));
    
    if (saveData) {
        stardust = D(saveData.stardust || 0);
        stardustPerClick = D(saveData.stardustPerClick || 1);
        stardustPerSecond = D(saveData.stardustPerSecond || 0);
        globalMultiplier = D(saveData.globalMultiplier || 1);

        if (saveData.producers) {
            if (saveData.producers.condenser) {
                stardustCondenser.owned = D(saveData.producers.condenser.owned || 0);
                stardustCondenser.multiplier = D(saveData.producers.condenser.multiplier || 1);
                stardustCondenser.freeOwned = D(saveData.producers.condenser.freeOwned || 0);
            }

            if (saveData.producers.collector) {
                stardustCollector.owned = D(saveData.producers.collector.owned || 0);
                stardustCollector.multiplier = D(saveData.producers.collector.multiplier || 1);
                stardustCollector.freeOwned = D(saveData.producers.collector.freeOwned || 0);
            }

            if (saveData.producers.generater) {
                stardustGenerater.owned = D(saveData.producers.generater.owned || 0);
                stardustGenerater.multiplier = D(saveData.producers.generater.multiplier || 1);
                stardustGenerater.freeOwned = D(saveData.producers.generater.freeOwned || 0);
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

        if (saveData.transformer) {
            transformerActive = !!saveData.transformer.active;
            transformerMultiplier = D(
                saveData.transformer.multiplier || 1
            );
            transformerTimeLeft = D(
                saveData.transformer.timeLeft || 0
            );
        
            if (transformerTimeLeft.lte(0)) {
                transformerActive = false;
                transformerMultiplier = D(1);
                transformerTimeLeft = D(0);
            }
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

        if (saveData.lastUpdateTime) {
            const elapsedSeconds =
                Math.max(0, Date.now() - Number(saveData.lastUpdateTime)) / 1000;
        
            offlineBacklog = Math.min(elapsedSeconds, 3600);
        }
        
        lastUpdateTime = Date.now();
        renderCollections();
        clampStardust();               
        stardustPerSecond = calculateSPS();

    }
}

// 重置游戏
function resetGame() {
    // 重置游戏状态
    stardust = D(0);
    stardustPerSecond = D(0);
    stardustPerClick = D(1);
    globalMultiplier = D(1);
    
    // 重置生产者
    stardustCondenser.owned = D(0);
    stardustCondenser.multiplier = D(1);
    stardustCondenser.freeOwned = D(0);
    
    stardustCollector.owned = D(0);
    stardustCollector.multiplier = D(1);
    stardustCollector.freeOwned = D(0);

    stardustGenerater.owned = D(0);
    stardustGenerater.multiplier = D(1);
    stardustGenerater.freeOwned = D(0);

    transformerActive = false;
    transformerMultiplier = D(1);
    transformerTimeLeft = D(0);

    offlineBacklog = 0;
    lastUpdateTime = Date.now();
    _reachedCapNotified = false;
    
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
            stardust = add(stardust, stardustPerClick);
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

    // 存档导入/导出
    const exportSaveBtn = document.getElementById('export-save-button');
    if (exportSaveBtn) exportSaveBtn.addEventListener('click', exportSave);

    const copySaveBtn = document.getElementById('copy-save-button');
    if (copySaveBtn) copySaveBtn.addEventListener('click', () => copySaveText(true));

    const importSaveBtn = document.getElementById('import-save-button');
    if (importSaveBtn) importSaveBtn.addEventListener('click', importSave);

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

    const notationSelect = document.getElementById('notation-select');
    if (notationSelect) {
        notationSelect.value = currentNotation;
        notationSelect.addEventListener('change', () => setNotation(notationSelect.value));
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

console.log("game0.2.0.js 加载完成");
console.info("这是一个彩蛋-->💙");
console.info("如果你看见了这条信息，那么说明你打开了控制台");

