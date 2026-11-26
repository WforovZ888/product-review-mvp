import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateStats,
  completeness,
  createProduct,
  transitionProduct,
  updateProduct,
  validateProduct,
} from "../state.js";

const validInput = {
  sku: "SKU-TEST-001",
  name: "测试商品",
  category: "家居生活",
  price: 99,
  stock: 20,
  supplier: "测试供应商",
  description: "这是一段满足二十个字要求的商品资料说明，用于自动测试审核流程。",
};

test("creates a draft with an audit trail", () => {
  const product = createProduct(validInput, {
    id: "p-1",
    now: "2026-11-26T09:00:00.000Z",
    actor: "王嘉铭",
  });
  assert.equal(product.status, "draft");
  assert.equal(product.history.length, 1);
  assert.equal(completeness(product), 100);
  assert.deepEqual(validateProduct(product), {});
});

test("requires the minimum product information before submission", () => {
  const product = createProduct(
    { ...validInput, description: "太短" },
    { id: "p-2", now: "2026-11-26T09:00:00.000Z" },
  );
  assert.throws(() => transitionProduct(product, "pending"), /至少需要 20 个字/);
});

test("supports submission, rejection, correction and approval", () => {
  const draft = createProduct(validInput, { id: "p-3", now: "2026-11-26T09:00:00.000Z" });
  const pending = transitionProduct(draft, "pending", {
    now: "2026-11-26T09:05:00.000Z",
  });
  const rejected = transitionProduct(pending, "rejected", {
    now: "2026-11-26T09:10:00.000Z",
    reason: "请补充更清晰的产品说明",
    actor: "审核员",
  });
  const corrected = updateProduct(rejected, {
    ...validInput,
    description: "已补充完整的产品材料、使用说明、交付范围和售后规则，满足重新提交要求。",
  });
  const resubmitted = transitionProduct(corrected, "pending");
  const approved = transitionProduct(resubmitted, "approved", { actor: "审核员" });

  assert.equal(rejected.status, "rejected");
  assert.match(rejected.rejectionReason, /补充/);
  assert.equal(approved.status, "approved");
  assert.equal(approved.history.at(-1).action, "审核通过");
});

test("calculates status counts and available inventory", () => {
  const products = [
    { status: "draft", stock: 0 },
    { status: "pending", stock: 8 },
    { status: "approved", stock: 12 },
    { status: "approved", stock: 20 },
  ];
  assert.deepEqual(calculateStats(products), {
    total: 4,
    draft: 1,
    pending: 1,
    approved: 2,
    rejected: 0,
    inventory: 32,
  });
});
