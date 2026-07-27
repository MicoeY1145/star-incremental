const collections = [
    {
        id: "Changelog",
        name: "更新日志",

        // ===== 你已写好的内容 =====
        time: "-Inf",
        keeper: "index.html",
        level: "Laitini",

        description: 
`更新日志：<br>
            //更新日志：忘了 忘了更新内容。
            //更新日志：0.1.3.2 修复BUG，增加新生产者：星尘生成器。
            //更新日志：0.1.4 新增升级：星尘凝聚器升级II，星尘生成器升级I，修复了BUG,进行了平衡性调整。
            //更新日志：0.1.4.1 修复了BUG。
            //更新日志：0.1.5 增加选项卡，滚动新闻，CSS样式切换。
            //更新日志：0.1.5.0.1 修复了两个BUG。
            //更新日志：0.1.5.1 修复了一个BUG。增加离线进度。星尘硬上限。
            //更新日志：0.1.6 增加了成就系统，收集信息系统和星尘转化器。
            //更新日志：0.2 星尘上限提升至1e308，并增加了星尘3倍器和其他升级，修复了七个BUG。
`,

        unlocked: false,

        condition: () => {
            return getProducerAmount(stardustCondenser).gte(1);
        }
    },
    {
        id: "DS-S-1",
        name: "凝聚器",

        // ===== 你已写好的内容 =====
        time: "-????",
        keeper: "enon",
        level: "ds",

        description: 
`记录编号：FDS-1
当拥有了超过200000000个凝聚器时
刷新页面后多出来了什么东西(当然了，只要你点开这个界面就会出现)
`,

        unlocked: false,

        condition: () => {
            return getProducerAmount(stardustCondenser).gte(200000000);
        }
    },
    {
        id: "DS-S-2",
        name: "吸引性",

        // ===== 你已写好的内容 =====
        time: "-???2",
        keeper: "llun",
        level: "ds",

        description: 
`记录编号：FDS-2
当拥有了超过100个生成器时
刷新页面后多出来了什么东西(当然了，只要你点开这个界面就会出现)
`,

        unlocked: false,

        condition: () => {
            return D(stardustGenerater.owned).gte(100);
        }
    }
];


// ===============================
// 检查解锁
// ===============================
function checkCollections() {
    collections.forEach(c => {
        if (!c.unlocked && c.condition()) {
            c.unlocked = true;
            renderCollections();
            showNotification("已收录档案：" + c.name);
        }
    });
}


// ===============================
// 渲染系统
// ===============================
function renderCollections() {

    const container = document.getElementById("collections-container");
    container.innerHTML = "";

    collections.forEach(c => {

        if (!c.unlocked) return;   // 不显示未解锁

        const item = document.createElement("div");
        item.className = "collection-item";

        const header = document.createElement("div");
        header.className = "collection-header";
        header.textContent = c.name;

        const meta = document.createElement("div");
        meta.className = "collection-meta";
        meta.textContent =
            `时间：${c.time} ｜ 保管单位：${c.keeper} ｜ 等级：${c.level.toUpperCase()}`;

        const content = document.createElement("div");
        content.className = "collection-content";
        content.textContent = c.description;
        content.style.display = "none";

        header.onclick = () => {
            content.style.display =
                content.style.display === "none" ? "block" : "none";
        };

        item.appendChild(header);
        item.appendChild(meta);
        item.appendChild(content);

        container.appendChild(item);
    });
}