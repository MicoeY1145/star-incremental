console.log("game0.1.5.js 开始执行");

// 使用版本化的存储键名
const SAVE_KEY = 'starIncrementalSave_v0_1_1';

const defaultCSS = "style0.1.5.css";
const alternateCSS = "style0.1.5(2).css";
let currentCSS = defaultCSS;

const newsSentences = [
    { text: "LRO是多少？", weight: 4 },
    { text: "如果发生了葛立恒数级的地震，该怎么防御呢？答案：我们只需要找到一片森林，森林里的第一颗数有一片树叶，第二棵树有三片树叶，第三棵树吗，有很多树叶，只需要把第三棵树的树叶建成建筑物就可以抵御葛立恒数级的地震", weight: 2 },
    { text: "本游戏会在0.2版本使用break_eternity.js", weight: 4 },
    { text: "如果你有空，可以试着去bilibili去搜索苊分子，那是作者的账号", weight: 3 },
    { text: "硬重置需谨慎。", weight: 5 },
    { text: "选项卡切换不自如，体验更差。", weight: 3 },
    { text: "如果你看见了这句话那么说明你看见了彩蛋！可惜我找不到彩蛋Emoji，只能给你一个蓝色的心了💙", weight: 0.00002 },
    { text: "很抱歉我们用完了增量游戏的笑话，只能让你看这句话了", weight: 2 },
    { text: "有的时候新闻会突然变化，消失或变化，该BUG将在v0.1.5.0.1版本修复", weight: 5 },
    { text: "其实一个星尘是一个碳12原子", weight: 3 },
    { text: "这是一把尺子：1-2-3-4-4.7-4.8-4.85-4.875-4.8825-4.89-4.8945-4.8995-4.9（受到软上限限制）",weight: 3},
    { text: "遗忘度超过复习度，进行一次无奖励的遗忘重置",weight: 4},
    { text: "老婆买了G(64)个瑞士卷，该如何分配呢？",weight: 2},
    { text: "五小时后更新",weight: 4},
    { text: "小明平时考的都很好，但是却在挑战中拿了倒数第3，因为在挑战中",weight: 3},
    { text: "天文学家在以超光速发表论文，但是这不违反相对论，因为并没有传递任何有效信息（也就是在水论文）",weight: 3},
];

let lastSentence = null;

let recursiveProductionEnabled = false;

// ============== 1. 游戏状态变量 ==============
let stardust = 0;
let stardustPerSecond = 0;
let stardustPerClick = 1;
let globalMultiplier = 1;

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
    }
];

// ============== 2. DOM 元素引用 ==============
let stardustCountEl, stardustPerSecondEl, stardustPerClickEl, clickButton;
let condenserCountEl, condenserCostEl, condenserProductionEl, buyCondenserButton;
let collectorCountEl, collectorCostEl, collectorProductionEl, buyCollectorButton;
let resetButton;

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
    if (newsTicker) {
        const sentence = getRandomWeightedSentence();
        newsTicker.textContent = sentence;

        
        const contentWidth = newsTicker.offsetWidth;

        
        const scrollSpeed = 70; 
        const duration = (contentWidth + window.innerWidth) / scrollSpeed;

        
        newsTicker.style.setProperty('--content-width', contentWidth + 'px');
        newsTicker.style.setProperty('--ticker-duration', duration + 's');
    }
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
}

// 渲染升级项（只显示已解锁的）
function renderUpgrades() {
    const upgradesContainer = document.getElementById('upgrades-grid');
    if (!upgradesContainer) return;
    
    // 移除所有现有升级项
    while (upgradesContainer.firstChild) {
        upgradesContainer.removeChild(upgradesContainer.firstChild);
    }
    
    
    
    // 渲染每个升级项
    upgrades.forEach(upgrade => {
        // 检查是否满足前提条件
        const prerequisitesMet = checkPrerequisites(upgrade);
        
        // 只渲染满足前提条件且未购买的升级
        if (prerequisitesMet && !upgrade.bought) {
            const upgradeElement = document.createElement('div');
            upgradeElement.className = 'upgrade';
            upgradeElement.id = `upgrade-${upgrade.id}`;
            
            upgradeElement.innerHTML = `
                <p class="upgrade-name">${upgrade.name}</p>
                <p>${getUpgradeDescription(upgrade)}</p>
                <p>成本: <span>${upgrade.cost}</span>星尘</p>
                <button class="buy-upgrade" data-id="${upgrade.id}">购买升级</button>
`;
            
            upgradesContainer.appendChild(upgradeElement);
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
    }
    return "未知效果";
}

// 检查前提条件是否满足
function checkPrerequisites(upgrade) {
    // 如果没有前提条件，直接返回true
    if (upgrade.prerequisites.length === 0) return true;
    
    // 检查所有前提条件是否都已满足
    return upgrade.prerequisites.every(preReqId => {
        const preReqUpgrade = upgrades.find(u => u.id === preReqId);
        return preReqUpgrade && preReqUpgrade.bought;
    });
}

// 购买升级
function buyUpgrade(upgradeId) {
    const upgrade = upgrades.find(u => u.id === upgradeId);

    if (upgrade && !upgrade.bought && stardust >= upgrade.cost) {
        stardust -= upgrade.cost;
        upgrade.bought = true;

        if (upgrade.effect.type === "click") {
            stardustPerClick += upgrade.effect.value;
        } else if (upgrade.effect.type === "producerMultiplier") {
            const producer = gameProducers[upgrade.effect.producer];
            if (producer) {
                producer.multiplier *= upgrade.effect.multiplier;
            }
        } else if (upgrade.effect.type === "globalMultiplier") {
            globalMultiplier *= upgrade.effect.multiplier;
        }
        
         else if (upgrade.effect.type === "recursiveProduction") {
        // Set a flag indicating recursive production is enabled
        recursiveProductionEnabled = true;
    }

        // 更新每秒星尘产量
        stardustPerSecond = calculateSPS();
        // 重新渲染升级项
        renderUpgrades();

        // 更新 UI 显示
        updateUI();
    }
}


function toggleCSS() {
    const cssLink = document.querySelector('link[rel="stylesheet"]'); // Find the link element
    
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
    return sps * globalMultiplier;
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

// 游戏主循环
let lastUpdateTime = Date.now();
function gameLoop() {
    const now = Date.now();
    const deltaTime = (now - lastUpdateTime) / 1000;
    lastUpdateTime = now;

    // 自动生产
    stardust += stardustPerSecond * deltaTime;

    // 递归生产
    if (recursiveProductionEnabled) {
        // 星尘收集器生产星尘凝聚器
        const totalCollectorCount = stardustCollector.owned + stardustCollector.freeOwned;
        const condenserProductionAmount = totalCollectorCount * 0.01 * deltaTime; // Adjust amount as needed
        for (let i = 0; i < condenserProductionAmount; i++) {
            buyProducer(stardustCondenser, true);
            stardustPerSecond = calculateSPS();
        }

        // 星尘生成器生产星尘收集器
        const totalGeneratorCount = stardustGenerater.owned + stardustGenerater.freeOwned;
        const collectorProductionAmount = totalGeneratorCount * 0.005 * deltaTime; // Adjust amount as needed
        for (let i = 0; i < collectorProductionAmount; i++) {
            buyProducer(stardustCollector, true);
            stardustPerSecond = calculateSPS();
        }
    }
    

    // 更新UI
    updateUI();
    
    // 继续循环
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
            },
        },
        upgrades: upgrades.map(u => ({
            id: u.id,
            bought: u.bought
        })),

        recursiveProductionEnabled: recursiveProductionEnabled,
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
                console.log("Loaded Condenser: owned =", stardustCondenser.owned, ", freeOwned =", stardustCondenser.freeOwned);
            }

            if (saveData.producers.collector) {
                stardustCollector.owned = saveData.producers.collector.owned || 0;
                stardustCollector.multiplier = saveData.producers.collector.multiplier || 1;
                stardustCollector.freeOwned = saveData.producers.collector.freeOwned || 0;
                console.log("Loaded Collector: owned =", stardustCollector.owned, ", freeOwned =", stardustCollector.freeOwned);
            }

            if (saveData.producers.generater) {
                stardustGenerater.owned = saveData.producers.generater.owned || 0;
                stardustGenerater.multiplier = saveData.producers.generater.multiplier || 1;
                stardustGenerater.freeOwned = saveData.producers.generater.freeOwned || 0;
                console.log("Loaded Generater: owned =", stardustGenerater.owned, ", freeOwned =", stardustGenerater.freeOwned);
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
         console.log("Loaded Recursive Production: enabled =", recursiveProductionEnabled);
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
    
    // 清除本地存储
    localStorage.removeItem(SAVE_KEY);
    
    // 更新UI
    updateUI();
    renderUpgrades();
    
    // 显示通知
    showNotification("游戏已重置！");
}

// ============== 4. 事件监听器 ==============
function initEventListeners() {
    // 主点击按钮
    if (clickButton) {
        clickButton.addEventListener('click', function() {
            stardust += stardustPerClick;
            updateUI();
        });
    } else {
        console.error("错误：未找到点击按钮元素");
    }
    
    // 购买星尘凝聚器
    if (buyCondenserButton) {
        buyCondenserButton.addEventListener('click', () => {
            buyProducer(stardustCondenser);
            stardustPerSecond = calculateSPS();
            
        });
    }
    
    // 购买星尘收集器
    if (buyCollectorButton) {
        buyCollectorButton.addEventListener('click', () => {
            buyProducer(stardustCollector);
            stardustPerSecond = calculateSPS();
        });
    }

    // 购买星尘生成器
    if (buyGeneraterButton) {
        buyGeneraterButton.addEventListener('click', () => {
            buyProducer(stardustGenerater);
            stardustPerSecond = calculateSPS();
        });
    }
    
    // 升级按钮事件
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('buy-upgrade')) {
            const upgradeElement = event.target.closest('.upgrade');
            if (upgradeElement) {
                const upgradeId = upgradeElement.id.replace('upgrade-', '');
                buyUpgrade(upgradeId);
            }
        }
    });

    
    // 重置按钮事件
    // Move the event listener to be correctly attached to the reset button within the options tab
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
        resetButton.addEventListener('click', resetGame);
    }

    // 选项卡切换事件
    document.querySelector('.tab-buttons').addEventListener('click', function(event) {
        if (event.target.classList.contains('tab-button')) {
            const tab = event.target.dataset.tab;
            openTab(tab);
        }
    });

    //CSS切换按钮事件
    const toggleCSSButton = document.getElementById('toggle-css-button');
    if (toggleCSSButton) {
        toggleCSSButton.addEventListener('click', toggleCSS);
    }
}

// 选项卡切换函数
function openTab(tabName) {
    // 隐藏别的选项卡内容
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });

    // 关闭其他选项卡
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });

    // 激活选择的选项卡的内容
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`.tab-button[data-tab="${tabName}"]`).classList.add('active');

    //在有升级时调用renderUpgrades函数
    if (tabName === 'stardust') {
        renderUpgrades();
    }
}

// ============== 5. 初始化游戏 ==============

    
    // 初始化DOM引用
    initDomReferences();
    
    // 初始化事件监听器
    initEventListeners();
    
    // 加载游戏
    loadGame();
    
    
    
    // 渲染升级
    renderUpgrades();
    
    // 更新UI
    updateUI();

    stardustPerSecond = calculateSPS();
    
    //启动新闻滚动系统
    updateNewsTicker(); // Initial update
    setInterval(updateNewsTicker, 20000);

    // 启动游戏循环
    requestAnimationFrame(gameLoop);

document.addEventListener('DOMContentLoaded', () => {
    initDomReferences();
    gameLoop(); // 启动主循环
    renderUpgrades();

    
}),

console.log("game0.1.1.js 加载完成")
console.info("这是一个彩蛋-->💙")
console.info("如果你看见了这条信息，那么说明你打开了控制台")


//更新日志：忘了 忘了更新内容。
//更新日志：0.1.3.2 修复BUG，增加新生产者：星尘生成器。
//更新日志：0.1.4 新增升级：星尘凝聚器升级II，星尘生成器升级I，修复了BUG,进行了平衡性调整。
//更新日志：0.1.4.1 修复了BUG。
//更新日志：0.1.5 增加选项卡，滚动新闻，CSS样式切换，新增升级。在购买了生产者辅助递归生产升级套件后，星尘收集器依旧生产星尘凝聚器，星尘生成器也不会生产星尘收集器。

