export const STATUS_META = {
  draft: { label: "草稿", tone: "neutral", description: "资料仍在编辑" },
  pending: { label: "待审核", tone: "warning", description: "等待审核人员处理" },
  approved: { label: "已通过", tone: "success", description: "资料已审核通过" },
  rejected: { label: "已驳回", tone: "danger", description: "需要修改后重新提交" },
};

export const CATEGORY_META = {
  家居生活: { short: "家居", accent: "#e96f51", wash: "#f9ddd4" },
  数码配件: { short: "数码", accent: "#267a78", wash: "#d8ebe8" },
  食品饮料: { short: "食品", accent: "#b7791f", wash: "#f5ead2" },
  美妆个护: { short: "美妆", accent: "#a64d72", wash: "#f2dee7" },
  办公文具: { short: "办公", accent: "#5169a8", wash: "#e1e6f6" },
};

const TRANSITIONS = {
  draft: new Set(["pending"]),
  rejected: new Set(["pending"]),
  pending: new Set(["approved", "rejected"]),
  approved: new Set([]),
};

export function createProduct(input, options = {}) {
  const now = options.now || new Date().toISOString();
  const id =
    options.id ||
    `product-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  return {
    id,
    sku: String(input.sku || "").trim(),
    name: String(input.name || "").trim(),
    category: String(input.category || "家居生活"),
    price: Number(input.price || 0),
    stock: Number(input.stock || 0),
    supplier: String(input.supplier || "").trim(),
    description: String(input.description || "").trim(),
    imageData: String(input.imageData || ""),
    status: "draft",
    createdAt: now,
    updatedAt: now,
    submittedAt: null,
    reviewedAt: null,
    reviewer: null,
    rejectionReason: "",
    history: [
      {
        at: now,
        action: "创建商品资料",
        actor: options.actor || "王嘉铭",
        note: "已保存为草稿",
      },
    ],
  };
}

export function updateProduct(product, input, options = {}) {
  if (product.status === "pending") {
    throw new Error("待审核商品不能修改，请等待审核结果");
  }
  if (product.status === "approved") {
    throw new Error("已通过商品已锁定，请新建变更草稿");
  }

  const now = options.now || new Date().toISOString();
  return {
    ...product,
    sku: String(input.sku || "").trim(),
    name: String(input.name || "").trim(),
    category: String(input.category || "家居生活"),
    price: Number(input.price || 0),
    stock: Number(input.stock || 0),
    supplier: String(input.supplier || "").trim(),
    description: String(input.description || "").trim(),
    imageData: String(input.imageData ?? product.imageData ?? ""),
    updatedAt: now,
    history: [
      ...product.history,
      {
        at: now,
        action: "更新商品资料",
        actor: options.actor || "王嘉铭",
        note: "已保存草稿",
      },
    ],
  };
}

export function validateProduct(product) {
  const errors = {};
  if (!product.name || product.name.length < 2) errors.name = "商品名称至少需要 2 个字";
  if (!product.sku) errors.sku = "请填写商品编码";
  if (!product.category) errors.category = "请选择商品分类";
  if (!Number.isFinite(product.price) || product.price < 0) errors.price = "价格不能小于 0";
  if (!Number.isInteger(product.stock) || product.stock < 0) errors.stock = "库存必须是 0 或正整数";
  if (!product.supplier) errors.supplier = "请填写供应商";
  if (!product.description || product.description.length < 20) {
    errors.description = "商品资料至少需要 20 个字";
  }
  return errors;
}

export function transitionProduct(product, nextStatus, options = {}) {
  if (!STATUS_META[nextStatus]) throw new Error("未知的审核状态");
  if (!TRANSITIONS[product.status]?.has(nextStatus)) {
    throw new Error(`商品不能从“${STATUS_META[product.status]?.label}”流转到“${STATUS_META[nextStatus].label}”`);
  }

  if (nextStatus === "pending") {
    const errors = validateProduct(product);
    if (Object.keys(errors).length) {
      throw new Error(Object.values(errors)[0]);
    }
  }

  if (nextStatus === "rejected" && !String(options.reason || "").trim()) {
    throw new Error("驳回时必须填写原因");
  }

  const now = options.now || new Date().toISOString();
  const actor = options.actor || (nextStatus === "pending" ? "王嘉铭" : "审核员");
  const action =
    nextStatus === "pending"
      ? "提交审核"
      : nextStatus === "approved"
        ? "审核通过"
        : "审核驳回";

  return {
    ...product,
    status: nextStatus,
    updatedAt: now,
    submittedAt: nextStatus === "pending" ? now : product.submittedAt,
    reviewedAt: ["approved", "rejected"].includes(nextStatus) ? now : null,
    reviewer: ["approved", "rejected"].includes(nextStatus) ? actor : null,
    rejectionReason: nextStatus === "rejected" ? String(options.reason).trim() : "",
    history: [
      ...product.history,
      {
        at: now,
        action,
        actor,
        note:
          nextStatus === "rejected"
            ? String(options.reason).trim()
            : nextStatus === "approved"
              ? "商品资料符合上架规范"
              : "资料完整，等待审核",
      },
    ],
  };
}

export function calculateStats(products) {
  return products.reduce(
    (result, product) => {
      result.total += 1;
      result[product.status] += 1;
      if (product.status === "approved") result.inventory += product.stock;
      return result;
    },
    { total: 0, draft: 0, pending: 0, approved: 0, rejected: 0, inventory: 0 },
  );
}

export function completeness(product) {
  const checks = [
    Boolean(product.sku),
    Boolean(product.name),
    Boolean(product.category),
    Number(product.price) >= 0,
    Number.isInteger(Number(product.stock)) && Number(product.stock) >= 0,
    Boolean(product.supplier),
    String(product.description || "").trim().length >= 20,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function formatPrice(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export function formatDateTime(value) {
  if (!value) return "尚未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
