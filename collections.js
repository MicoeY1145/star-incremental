const collections = [
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
刷新页面后多出来了什么东西
`,

        unlocked: false,

        condition: () => {
            return stardustCondenser.owned + (stardustCondenser.freeOwned || 0) >= 200000000;
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
刷新页面后多出来了什么东西
`,

        unlocked: false,

        condition: () => {
            return stardustGenerater.owned >= 100;
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