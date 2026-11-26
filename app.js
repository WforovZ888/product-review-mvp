import {
  CATEGORY_META,
  STATUS_META,
  calculateStats,
  completeness,
  createProduct,
  formatDateTime,
  formatPrice,
  transitionProduct,
  updateProduct,
  validateProduct,
} from "./state.js";

const STORAGE_KEY = "product-review-studio-v1";
const root = document.querySelector("#app");
const toastRegion = document.querySelector("#toast-region");

const state = {
  products: loadProducts(),
  view: "dashboard",
  search: "",
  statusFilter: "all",
  role: "operations",
  selectedId: null,
  modalMode: null,
  editingId: null,
  draftImage: "",
  rejectMode: false,
};

const icons = {
  dashboard: "◫",
  products: "▦",
  review: "✓",
  guide: "◇",
  plus: "+",
  search: "⌕",
  close: "×",
  arrow: "→",
};

function artwork(label, accent, wash) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${wash}"/>
          <stop offset="1" stop-color="#fffdf8"/>
        </linearGradient>
      </defs>
      <rect width="240" height="240" rx="48" fill="url(#g)"/>
      <circle cx="195" cy="42" r="52" fill="${accent}" opacity=".13"/>
      <path d="M45 178c32-42 69-40 101-12 17 15 32 14 49-2v38H45z" fill="${accent}" opacity=".22"/>
      <rect x="57" y="58" width="126" height="90" rx="28" fill="#fff" opacity=".9"/>
      <text x="120" y="114" text-anchor="middle" font-family="PingFang SC, sans-serif"
        font-size="30" font-weight="700" fill="${accent}">${escapeHtml(label)}</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createSeedProducts() {
  const now = Date.now();
  const items = [
    {
      id: "seed-kettle",
      sku: "HOME-KT-021",
      name: "雾白恒温电热水壶",
      category: "家居生活",
      price: 229,
      stock: 86,
      supplier: "森屿家居",
      description:
        "1.7L 大容量，六档控温，适合家庭冲泡茶饮与日常饮水。壶身采用食品级不锈钢内胆，附自动断电与防干烧保护。",
      imageData: artwork("壶", "#e96f51", "#f9ddd4"),
      status: "pending",
      history: [
        { at: iso(now, -180), action: "创建商品资料", actor: "王嘉铭", note: "已保存为草稿" },
        { at: iso(now, -60), action: "提交审核", actor: "王嘉铭", note: "资料完整，等待审核" },
      ],
    },
    {
      id: "seed-charger",
      sku: "DIG-CHG-108",
      name: "磁吸折叠三合一充电座",
      category: "数码配件",
      price: 169,
      stock: 41,
      supplier: "临界数码",
      description:
        "支持手机、耳机与手表同时充电，铝合金支架可折叠收纳。内置温控保护，桌面与差旅场景均可使用。",
      imageData: artwork("充", "#267a78", "#d8ebe8"),
      status: "approved",
      history: [
        { at: iso(now, -2880), action: "创建商品资料", actor: "王嘉铭", note: "已保存为草稿" },
        { at: iso(now, -2760), action: "提交审核", actor: "王嘉铭", note: "等待审核" },
        { at: iso(now, -2620), action: "审核通过", actor: "审核员", note: "资料符合上架规范" },
      ],
    },
    {
      id: "seed-coffee",
      sku: "FOOD-CF-034",
      name: "云南日晒挂耳咖啡礼盒",
      category: "食品饮料",
      price: 89,
      stock: 130,
      supplier: "山野食集",
      description:
        "精选云南保山产区咖啡豆，中浅烘焙，柑橘与坚果风味。独立氮气保鲜包装，一盒十袋，适合办公室与旅行冲泡。",
      imageData: artwork("咖", "#b7791f", "#f5ead2"),
      status: "rejected",
      rejectionReason: "食品经营许可证照片不清晰，请补充完整许可证编号与有效期后重新提交。",
      history: [
        { at: iso(now, -1440), action: "创建商品资料", actor: "王嘉铭", note: "已保存为草稿" },
        { at: iso(now, -1320), action: "提交审核", actor: "王嘉铭", note: "等待审核" },
        {
          at: iso(now, -1260),
          action: "审核驳回",
          actor: "审核员",
          note: "食品经营许可证照片不清晰，请补充完整许可证编号与有效期后重新提交。",
        },
      ],
    },
    {
      id: "seed-book",
      sku: "WORK-NB-059",
      name: "布面线装工作手册",
      category: "办公文具",
      price: 36,
      stock: 0,
      supplier: "留白制品",
      description:
        "A5 尺寸布面精装笔记本，100g 米白道林纸，可 180 度平摊。内页包含日期、待办与自由记录区域，适合会议与项目复盘。",
      imageData: artwork("册", "#5169a8", "#e1e6f6"),
      status: "draft",
      history: [
        { at: iso(now, -35), action: "创建商品资料", actor: "王嘉铭", note: "已保存为草稿" },
      ],
    },
  ];

  return items.map((item) => ({
    ...item,
    createdAt: item.history[0].at,
    updatedAt: item.history.at(-1).at,
    submittedAt:
      item.status === "pending" || item.status === "approved" || item.status === "rejected"
        ? item.history.find((entry) => entry.action === "提交审核")?.at || null
        : null,
    reviewedAt:
      item.status === "approved" || item.status === "rejected" ? item.history.at(-1).at : null,
    reviewer:
      item.status === "approved" || item.status === "rejected" ? item.history.at(-1).actor : null,
  }));
}

function iso(now, minuteDelta) {
  return new Date(now + minuteDelta * 60_000).toISOString();
}

function loadProducts() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (Array.isArray(stored) && stored.length) return stored;
  } catch (error) {
    console.warn("无法读取本地数据，已加载演示数据。", error);
  }
  return createSeedProducts();
}

function saveProducts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.products));
  } catch (error) {
    showToast("本地存储空间不足，本次修改仅保留在当前页面。", true);
    console.warn("无法保存到 localStorage。", error);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusBadge(status) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return `<span class="badge badge-${meta.tone}">${meta.label}</span>`;
}

function badgeLabel(tone, label) {
  return `<span class="badge badge-${tone}">${label}</span>`;
}

function imageFor(product) {
  const meta = CATEGORY_META[product.category] || CATEGORY_META["家居生活"];
  return (
    product.imageData ||
    artwork(meta.short, meta.accent, meta.wash)
  );
}

function render() {
  const stats = calculateStats(state.products);
  root.innerHTML = `
    <div class="app-shell">
      ${renderSidebar(stats)}
      <main class="main">
        ${renderTopbar()}
        <div class="content">${renderCurrentView(stats)}</div>
      </main>
    </div>
    ${renderMobileNav(stats)}
    ${state.modalMode ? renderProductModal() : ""}
    ${state.selectedId ? renderDetailDrawer() : ""}
  `;
}

function renderSidebar(stats) {
  return `
    <aside class="sidebar" aria-label="主导航">
      <div class="brand">
        <div class="brand-mark">审</div>
        <div>
          <span class="brand-title">商审台</span>
          <span class="brand-subtitle">Listing Review Studio</span>
        </div>
      </div>
      <div class="nav-label">工作空间</div>
      <nav class="nav">
        ${navButton("dashboard", "工作台", icons.dashboard)}
        ${navButton("products", "商品资料", icons.products)}
        ${navButton("review", "审核队列", icons.review, stats.pending)}
        ${navButton("guide", "资料规范", icons.guide)}
      </nav>
      <div class="sidebar-footer">
        <strong>开源创新思维课程作业</strong><br />
        王嘉铭 · f25011136
      </div>
    </aside>
  `;
}

function navButton(view, label, icon, count = 0) {
  return `
    <button class="nav-item ${state.view === view ? "is-active" : ""}" data-nav="${view}">
      <span class="nav-item-main">
        <span class="nav-icon" aria-hidden="true">${icon}</span>
        <span>${label}</span>
      </span>
      ${count ? `<span class="nav-count">${count}</span>` : ""}
    </button>
  `;
}

function renderTopbar() {
  const roleLabel = state.role === "operations" ? "运营人员" : "审核人员";
  return `
    <header class="topbar">
      <div class="topbar-title">
        当前身份：<strong>${roleLabel}</strong> · 所有修改仅保存在本机浏览器
      </div>
      <div class="topbar-actions">
        <div class="role-switch" aria-label="切换演示身份">
          <button class="${state.role === "operations" ? "is-active" : ""}" data-role="operations">运营</button>
          <button class="${state.role === "reviewer" ? "is-active" : ""}" data-role="reviewer">审核</button>
        </div>
        <div class="avatar" title="王嘉铭">王</div>
      </div>
    </header>
  `;
}

function renderMobileNav(stats) {
  return `
    <nav class="mobile-nav" aria-label="移动端导航">
      ${navButton("dashboard", "工作台", icons.dashboard)}
      ${navButton("products", "商品", icons.products)}
      ${navButton("review", "审核", icons.review, stats.pending)}
      ${navButton("guide", "规范", icons.guide)}
    </nav>
  `;
}

function renderCurrentView(stats) {
  if (state.view === "products") return renderProductsPage();
  if (state.view === "review") return renderReviewPage();
  if (state.view === "guide") return renderGuidePage();
  return renderDashboard(stats);
}

function renderDashboard(stats) {
  const recent = [...state.products]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 4);
  const pending = state.products.filter((product) => product.status === "pending");

  return `
    <section class="page-head">
      <div>
        <div class="eyebrow">Operations overview</div>
        <h1>让每一次上架，都有据可查。</h1>
        <p class="page-description">从资料收集到审核结论，把商品上架过程变成一条清晰、可追踪的协作链路。</p>
      </div>
      <button class="primary-button" data-action="create-product">${icons.plus} 新建商品资料</button>
    </section>

    <section class="stats-grid" aria-label="商品数据概览">
      ${statCard("商品总数", stats.total, "全部运营商品", "#e5e9e4")}
      ${statCard("待审核", stats.pending, "等待审核结论", "#f8e9c8")}
      ${statCard("已通过", stats.approved, "资料已合规", "#dcefe5")}
      ${statCard("可售库存", stats.inventory, "已通过商品合计", "#f9ded5")}
    </section>

    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="eyebrow">Recent activity</div>
            <h2>最近更新</h2>
          </div>
          <button class="ghost-button button-small" data-nav="products">查看全部 ${icons.arrow}</button>
        </div>
        <div class="panel-body">
          <div class="mini-list">
            ${recent.map(renderMiniRow).join("")}
          </div>
        </div>
      </section>

      <section class="spotlight">
        <span class="badge badge-warning">${pending.length} 件待处理</span>
        <h2>审核工作台<br />今天还有 ${pending.length} 件商品</h2>
        <p>集中查看资料完整度、提交时间和审核记录，减少来回沟通。</p>
        <button class="primary-button" data-nav="review">进入审核队列 ${icons.arrow}</button>
      </section>
    </div>
  `;
}

function statCard(label, value, foot, wash) {
  return `
    <article class="stat-card" style="--card-wash:${wash}">
      <span class="stat-label">${label}</span>
      <strong class="stat-value">${value}</strong>
      <span class="stat-foot">${foot}</span>
    </article>
  `;
}

function renderMiniRow(product) {
  return `
    <button class="mini-row" data-detail="${product.id}">
      <img class="thumb" src="${imageFor(product)}" alt="" />
      <span>
        <span class="mini-name">${escapeHtml(product.name)}</span>
        <span class="mini-meta">${escapeHtml(product.sku)} · ${escapeHtml(product.category)}</span>
      </span>
      ${statusBadge(product.status)}
    </button>
  `;
}

function filteredProducts({ pendingOnly = false } = {}) {
  const query = state.search.trim().toLowerCase();
  return state.products.filter((product) => {
    if (pendingOnly && product.status !== "pending") return false;
    if (!pendingOnly && state.statusFilter !== "all" && product.status !== state.statusFilter) {
      return false;
    }
    if (!query) return true;
    return [product.name, product.sku, product.supplier, product.category]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

function renderProductsPage() {
  const products = filteredProducts();
  return `
    <section class="page-head">
      <div>
        <div class="eyebrow">Product library</div>
        <h1>商品资料</h1>
        <p class="page-description">维护商品基础信息，完成完整度检查后提交审核。</p>
      </div>
      <button class="primary-button" data-action="create-product">${icons.plus} 新建商品资料</button>
    </section>

    <div class="toolbar">
      <label class="search-wrap">
        <span class="search-icon" aria-hidden="true">${icons.search}</span>
        <input class="search-input" id="product-search" type="search"
          placeholder="搜索商品名称、编码或供应商" value="${escapeHtml(state.search)}" />
      </label>
      <select class="filter-select" id="status-filter" aria-label="按状态筛选">
        <option value="all" ${state.statusFilter === "all" ? "selected" : ""}>全部状态</option>
        ${Object.entries(STATUS_META)
          .map(
            ([value, meta]) =>
              `<option value="${value}" ${state.statusFilter === value ? "selected" : ""}>${meta.label}</option>`,
          )
          .join("")}
      </select>
    </div>

    <section class="panel">
      <div class="table-wrap">
        <table class="product-table">
          <thead>
            <tr>
              <th>商品</th>
              <th>分类</th>
              <th>价格</th>
              <th>库存</th>
              <th>状态</th>
              <th>更新时间</th>
              <th><span class="sr-only">操作</span></th>
            </tr>
          </thead>
          <tbody>
            ${products.map(renderProductRow).join("")}
          </tbody>
        </table>
      </div>
      ${
        products.length
          ? ""
          : `
            <div class="empty-state">
              <h3>没有匹配的商品</h3>
              <p>调整搜索条件，或新建一条商品资料。</p>
            </div>
          `
      }
    </section>
  `;
}

function renderProductRow(product) {
  return `
    <tr>
      <td>
        <div class="product-cell">
          <img class="thumb" src="${imageFor(product)}" alt="" />
          <span>
            <span class="product-name">${escapeHtml(product.name)}</span>
            <span class="product-code">${escapeHtml(product.sku)}</span>
          </span>
        </div>
      </td>
      <td>${escapeHtml(product.category)}</td>
      <td class="price">${formatPrice(product.price)}</td>
      <td>${product.stock}</td>
      <td>${statusBadge(product.status)}</td>
      <td>${formatDateTime(product.updatedAt)}</td>
      <td>
        <div class="row-actions">
          <button class="secondary-button button-small" data-detail="${product.id}">查看</button>
          ${
            ["draft", "rejected"].includes(product.status)
              ? `<button class="ghost-button button-small" data-edit="${product.id}">编辑</button>`
              : ""
          }
        </div>
      </td>
    </tr>
  `;
}

function renderReviewPage() {
  const pending = filteredProducts({ pendingOnly: true });
  const rejected = state.products.filter((product) => product.status === "rejected");
  return `
    <section class="page-head">
      <div>
        <div class="eyebrow">Review workspace</div>
        <h1>审核队列</h1>
        <p class="page-description">
          先核对资料完整度，再给出通过或驳回结论。当前以“${state.role === "reviewer" ? "审核人员" : "运营人员"}”身份浏览。
        </p>
      </div>
      ${
        state.role === "operations"
          ? `<button class="secondary-button" data-role="reviewer">切换为审核身份</button>`
          : `<span class="badge badge-success">审核权限已开启</span>`
      }
    </section>

    <div class="toolbar">
      <label class="search-wrap">
        <span class="search-icon" aria-hidden="true">${icons.search}</span>
        <input class="search-input" id="product-search" type="search"
          placeholder="搜索待审商品" value="${escapeHtml(state.search)}" />
      </label>
    </div>

    ${
      pending.length
        ? `<section class="queue-grid">${pending.map(renderQueueCard).join("")}</section>`
        : `
          <div class="empty-state">
            <h3>当前没有待审核商品</h3>
            <p>审核队列已经清空。${rejected.length ? `另有 ${rejected.length} 件驳回商品等待运营修改。` : ""}</p>
            <button class="secondary-button" data-nav="products">返回商品资料</button>
          </div>
        `
    }
  `;
}

function renderQueueCard(product) {
  const percent = completeness(product);
  return `
    <article class="queue-card">
      <div class="queue-card-top">
        <img class="thumb" src="${imageFor(product)}" alt="" />
        <div>
          <h3>${escapeHtml(product.name)}</h3>
          <div class="queue-card-meta">${escapeHtml(product.sku)} · ${escapeHtml(product.supplier)}</div>
          <div class="queue-card-meta">提交于 ${formatDateTime(product.submittedAt)}</div>
        </div>
        ${statusBadge(product.status)}
      </div>
      <div class="queue-card-actions">
        <div class="progress">
          <span class="progress-bar"><span style="width:${percent}%"></span></span>
          <span>资料 ${percent}%</span>
        </div>
        <button class="primary-button button-small" data-detail="${product.id}">查看审核</button>
      </div>
    </article>
  `;
}

function renderGuidePage() {
  const checks = [
    ["01", "资料完整", "名称、编码、分类、价格、库存、供应商和详情说明必须填写完整。"],
    ["02", "状态锁定", "商品进入待审核后不能修改，避免审核结论与展示内容不一致。"],
    ["03", "结论留痕", "驳回必须填写原因；通过和驳回都会记录审核人与时间。"],
    ["04", "修改重提", "被驳回的商品可以修改资料，并再次提交到审核队列。"],
    ["05", "通过锁定", "审核通过后商品资料锁定，避免后续被误改。"],
    ["06", "本地演示", "当前演示版使用浏览器本地存储，不含真实商品或个人信息。"],
  ];
  return `
    <section class="page-head">
      <div>
        <div class="eyebrow">Data quality guide</div>
        <h1>资料规范</h1>
        <p class="page-description">让审核标准透明，让每一次驳回都能对应具体改进动作。</p>
      </div>
    </section>
    <section class="guide-grid">
      ${checks
        .map(
          ([number, title, description]) => `
            <article class="guide-card">
              <div class="guide-icon">${number}</div>
              <h3>${title}</h3>
              <p>${description}</p>
            </article>
          `,
        )
        .join("")}
    </section>
  `;
}

function renderProductModal() {
  const product =
    state.modalMode === "edit"
      ? state.products.find((item) => item.id === state.editingId)
      : null;
  state.draftImage = product?.imageData || state.draftImage || "";
  return `
    <div class="modal-backdrop" data-close-modal>
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
        <div class="modal-head">
          <div>
            <div class="eyebrow">${product ? "Edit product" : "New listing"}</div>
            <h2 id="product-modal-title">${product ? "编辑商品资料" : "新建商品资料"}</h2>
            <p>${product ? "修改后可以继续保存草稿或重新提交。" : "先保存草稿，资料完整后再提交审核。"}</p>
          </div>
          <button class="icon-button" data-close-modal aria-label="关闭">${icons.close}</button>
        </div>
        <form class="product-form" id="product-form" novalidate>
          <div class="form-grid">
            <label class="field">
              <span>商品名称 <em>*</em></span>
              <input name="name" value="${escapeHtml(product?.name || "")}" autocomplete="off" />
              <small class="field-error" data-error="name"></small>
            </label>
            <label class="field">
              <span>商品编码 <em>*</em></span>
              <input name="sku" value="${escapeHtml(product?.sku || makeSku())}" autocomplete="off" />
              <small class="field-error" data-error="sku"></small>
            </label>
            <label class="field">
              <span>商品分类 <em>*</em></span>
              <select name="category">
                ${Object.keys(CATEGORY_META)
                  .map(
                    (category) =>
                      `<option ${product?.category === category ? "selected" : ""}>${category}</option>`,
                  )
                  .join("")}
              </select>
              <small class="field-error" data-error="category"></small>
            </label>
            <label class="field">
              <span>供应商 <em>*</em></span>
              <input name="supplier" value="${escapeHtml(product?.supplier || "")}" autocomplete="organization" />
              <small class="field-error" data-error="supplier"></small>
            </label>
            <label class="field">
              <span>销售价格（元）<em>*</em></span>
              <input name="price" type="number" min="0" step="0.01" value="${product?.price ?? ""}" />
              <small class="field-error" data-error="price"></small>
            </label>
            <label class="field">
              <span>上架库存 <em>*</em></span>
              <input name="stock" type="number" min="0" step="1" value="${product?.stock ?? ""}" />
              <small class="field-error" data-error="stock"></small>
            </label>
            <div class="field field-full">
              <span>商品主图</span>
              <div class="image-field">
                <img class="image-preview" id="image-preview" src="${imageFor(
                  product || { category: "家居生活" },
                )}" alt="商品主图预览" />
                <label class="upload-box">
                  <span>
                    <strong>上传商品主图</strong>
                    支持 JPG、PNG、WebP，最大 2MB
                    <input class="file-input" id="image-upload" type="file" accept="image/jpeg,image/png,image/webp" />
                  </span>
                </label>
              </div>
            </div>
            <label class="field field-full">
              <span>商品详情 <em>*</em></span>
              <textarea name="description" placeholder="填写卖点、规格、交付范围、售后与注意事项（至少 20 个字）">${escapeHtml(
                product?.description || "",
              )}</textarea>
              <small class="field-error" data-error="description"></small>
            </label>
          </div>
          <div class="modal-actions">
            <button type="button" class="ghost-button" data-close-modal>取消</button>
            <div class="modal-actions-right">
              <button type="button" class="secondary-button" data-save-mode="draft">保存草稿</button>
              <button type="button" class="primary-button" data-save-mode="pending">提交审核</button>
            </div>
          </div>
        </form>
      </section>
    </div>
  `;
}

function makeSku() {
  return `SKU-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
}

function renderDetailDrawer() {
  const product = state.products.find((item) => item.id === state.selectedId);
  if (!product) return "";
  const percent = completeness(product);
  const canEdit = ["draft", "rejected"].includes(product.status);
  const canReview = product.status === "pending" && state.role === "reviewer";
  return `
    <div class="drawer-backdrop" data-close-drawer>
      <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <div class="drawer-head">
          <div>
            <div class="eyebrow">Product detail</div>
            <h2 id="detail-title">商品详情</h2>
            <p>${statusBadge(product.status)} 资料完整度 ${percent}%</p>
          </div>
          <button class="icon-button" data-close-drawer aria-label="关闭">${icons.close}</button>
        </div>
        <div class="drawer-body">
          <div class="detail-hero">
            <img class="thumb" src="${imageFor(product)}" alt="" />
            <div>
              <div class="eyebrow">${escapeHtml(product.category)}</div>
              <h2>${escapeHtml(product.name)}</h2>
              <div class="product-code">${escapeHtml(product.sku)}</div>
              <strong class="detail-price">${formatPrice(product.price)}</strong>
            </div>
          </div>
          <div class="detail-grid">
            <div class="detail-fact"><span>供应商</span><strong>${escapeHtml(product.supplier)}</strong></div>
            <div class="detail-fact"><span>库存</span><strong>${product.stock} 件</strong></div>
            <div class="detail-fact"><span>更新时间</span><strong>${formatDateTime(product.updatedAt)}</strong></div>
            <div class="detail-fact"><span>审核人</span><strong>${escapeHtml(product.reviewer || "尚未审核")}</strong></div>
          </div>
          <div class="description-block">
            <div class="eyebrow">Product story</div>
            <h3>资料说明</h3>
            <p>${escapeHtml(product.description)}</p>
          </div>
          ${
            product.rejectionReason
              ? `
                <div class="review-box">
                  <span class="badge badge-danger">驳回原因</span>
                  <p>${escapeHtml(product.rejectionReason)}</p>
                </div>
              `
              : ""
          }
          <div class="description-block">
            <div class="eyebrow">Audit trail</div>
            <h3>审核记录</h3>
            <div class="timeline">
              ${[...product.history]
                .reverse()
                .map(
                  (item) => `
                    <div class="timeline-item">
                      <strong>${escapeHtml(item.action)} · ${escapeHtml(item.actor)}</strong>
                      <span>${formatDateTime(item.at)}</span>
                      <p>${escapeHtml(item.note)}</p>
                    </div>
                  `,
                )
                .join("")}
            </div>
          </div>
          ${
            canReview
              ? `
                <div class="review-box">
                  <h3>给出审核结论</h3>
                  <p>通过后商品将锁定；驳回时必须填写明确原因。</p>
                  ${
                    state.rejectMode
                      ? `
                        <label class="reject-field">
                          <span>驳回原因</span>
                          <textarea id="reject-reason" placeholder="例如：商品详情缺少售后规则，请补充后重新提交"></textarea>
                        </label>
                        <div class="review-actions">
                          <button class="danger-button" data-action="confirm-reject">确认驳回</button>
                          <button class="ghost-button" data-action="cancel-reject">取消</button>
                        </div>
                      `
                      : `
                        <div class="review-actions">
                          ${canEdit ? `<button class="secondary-button" data-edit="${product.id}">编辑资料</button>` : ""}
                          <button class="primary-button" data-action="approve">审核通过</button>
                          <button class="danger-button" data-action="start-reject">驳回</button>
                        </div>
                      `
                  }
                </div>
              `
              : canEdit
                ? `
                  <div class="review-box">
                    <h3>${product.status === "rejected" ? "根据原因修改后重新提交" : "资料尚未提交"}</h3>
                    <p>${product.status === "rejected" ? "修改完整后即可重新进入审核队列。" : "完成资料并提交审核后，商品将暂时锁定。"}</p>
                    <div class="review-actions">
                      <button class="primary-button" data-edit="${product.id}">编辑资料</button>
                    </div>
                  </div>
                `
                : ""
          }
        </div>
      </aside>
    </div>
  `;
}

function openModal(mode, id = null) {
  state.modalMode = mode;
  state.editingId = id;
  state.draftImage = "";
  render();
}

function closeModal() {
  state.modalMode = null;
  state.editingId = null;
  state.draftImage = "";
  render();
}

function openDetail(id) {
  state.selectedId = id;
  state.rejectMode = false;
  render();
}

function closeDetail() {
  state.selectedId = null;
  state.rejectMode = false;
  render();
}

function contractData(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  data.imageData = state.draftImage;
  return data;
}

function showFieldErrors(errors) {
  document.querySelectorAll("[data-error]").forEach((element) => {
    element.textContent = errors[element.dataset.error] || "";
  });
  document.querySelectorAll("#product-form [name]").forEach((element) => {
    const invalid = Boolean(errors[element.name]);
    element.setAttribute("aria-invalid", String(invalid));
  });
}

function persistFromForm(targetStatus) {
  const form = document.querySelector("#product-form");
  if (!form) return;
  const input = contractData(form);
  const existing =
    state.modalMode === "edit"
      ? state.products.find((item) => item.id === state.editingId)
      : null;
  let product;

  try {
    product = existing
      ? updateProduct(existing, input, { actor: "王嘉铭" })
      : createProduct(input, { actor: "王嘉铭" });

    if (targetStatus === "pending") {
      product = transitionProduct(product, "pending", { actor: "王嘉铭" });
    } else {
      const errors = validateProduct(product);
      showFieldErrors(errors);
    }
  } catch (error) {
    showToast(error.message, true);
    return;
  }

  if (existing) {
    state.products = state.products.map((item) => (item.id === product.id ? product : item));
  } else {
    state.products = [product, ...state.products];
  }
  saveProducts();
  state.modalMode = null;
  state.editingId = null;
  state.selectedId = product.id;
  state.rejectMode = false;
  render();
  showToast(targetStatus === "pending" ? "已提交审核" : "草稿已保存");
}

function updateStatus(status, options = {}) {
  const product = state.products.find((item) => item.id === state.selectedId);
  if (!product) return;
  try {
    const next = transitionProduct(product, status, options);
    state.products = state.products.map((item) => (item.id === next.id ? next : item));
    saveProducts();
    state.rejectMode = false;
    render();
    showToast(status === "approved" ? "审核已通过" : "商品已驳回");
  } catch (error) {
    showToast(error.message, true);
  }
}

function showToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.className = `toast ${isError ? "is-error" : ""}`;
  toast.textContent = message;
  toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 2800);
}

root.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-nav]");
  if (nav) {
    state.view = nav.dataset.nav;
    state.search = "";
    state.statusFilter = "all";
    render();
    return;
  }

  const role = event.target.closest("[data-role]");
  if (role) {
    state.role = role.dataset.role;
    render();
    return;
  }

  const detail = event.target.closest("[data-detail]");
  if (detail) {
    openDetail(detail.dataset.detail);
    return;
  }

  const edit = event.target.closest("[data-edit]");
  if (edit) {
    state.selectedId = null;
    openModal("edit", edit.dataset.edit);
    return;
  }

  if (event.target.closest('[data-action="create-product"]')) {
    openModal("create");
    return;
  }

  const closeModalButton = event.target.closest("button[data-close-modal]");
  if (closeModalButton || event.target.classList.contains("modal-backdrop")) {
    closeModal();
    return;
  }

  const closeDrawerButton = event.target.closest("button[data-close-drawer]");
  if (closeDrawerButton || event.target.classList.contains("drawer-backdrop")) {
    closeDetail();
    return;
  }

  const saveMode = event.target.closest("[data-save-mode]");
  if (saveMode) {
    persistFromForm(saveMode.dataset.saveMode);
    return;
  }

  if (event.target.closest('[data-action="approve"]')) {
    updateStatus("approved", { actor: "审核员" });
    return;
  }

  if (event.target.closest('[data-action="start-reject"]')) {
    state.rejectMode = true;
    render();
    document.querySelector("#reject-reason")?.focus();
    return;
  }

  if (event.target.closest('[data-action="cancel-reject"]')) {
    state.rejectMode = false;
    render();
    return;
  }

  if (event.target.closest('[data-action="confirm-reject"]')) {
    const reason = document.querySelector("#reject-reason")?.value || "";
    if (reason.trim().length < 6) {
      showToast("请填写至少 6 个字的驳回原因", true);
      return;
    }
    updateStatus("rejected", { actor: "审核员", reason });
  }
});

root.addEventListener("input", (event) => {
  if (event.target.id === "product-search") {
    state.search = event.target.value;
    const caret = event.target.selectionStart;
    render();
    const input = document.querySelector("#product-search");
    input?.focus();
    input?.setSelectionRange(caret, caret);
    return;
  }

  if (event.target.id === "status-filter") {
    state.statusFilter = event.target.value;
    render();
  }
});

root.addEventListener("change", async (event) => {
  if (event.target.id !== "image-upload") return;
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast("图片超过 2MB，请压缩后重试", true);
    event.target.value = "";
    return;
  }
  const dataUrl = await readFileAsDataUrl(file);
  state.draftImage = dataUrl;
  const preview = document.querySelector("#image-preview");
  if (preview) preview.src = dataUrl;
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (state.modalMode) closeModal();
  else if (state.selectedId) closeDetail();
});

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

saveProducts();
render();
