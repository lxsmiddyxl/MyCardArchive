/**
 * Collects likely Tailwind class strings from JSX `className` / `bodyClassName` values
 * and from `cn` / `clsx` / `cva` call arguments (static segments only).
 */

"use strict";

const CLASS_ATTRS = new Set(["className", "bodyClassName"]);

/**
 * @param {import('estree').Expression | import('estree').SpreadElement | null | undefined} expr
 * @returns {string[]}
 */
function collectStringsFromExpression(expr) {
  if (!expr || expr.type === "JSXEmptyExpression") return [];
  /** @type {string[]} */
  const out = [];

  function walk(node) {
    if (!node) return;

    if (node.type === "Literal" && typeof node.value === "string") {
      out.push(node.value);
      return;
    }

    if (node.type === "TemplateLiteral") {
      for (const q of node.quasis) {
        if (q.value && q.value.raw) out.push(q.value.raw);
      }
      return;
    }

    if (node.type === "ConditionalExpression") {
      walk(node.consequent);
      walk(node.alternate);
      return;
    }

    if (node.type === "LogicalExpression") {
      walk(node.left);
      walk(node.right);
      return;
    }

    if (node.type === "BinaryExpression" && node.operator === "+") {
      walk(node.left);
      walk(node.right);
      return;
    }

    if (node.type === "ArrayExpression") {
      for (const el of node.elements) {
        if (el) walk(el);
      }
      return;
    }

    if (node.type === "CallExpression") {
      const callee = node.callee;
      let fnName = null;
      if (callee.type === "Identifier") fnName = callee.name;
      if (
        callee.type === "MemberExpression" &&
        callee.property.type === "Identifier" &&
        callee.object.type === "Identifier"
      ) {
        fnName = `${callee.object.name}.${callee.property.name}`;
      }
      if (
        fnName === "cn" ||
        fnName === "clsx" ||
        fnName === "classNames" ||
        fnName === "cva"
      ) {
        for (const arg of node.arguments) {
          walk(arg);
        }
        return;
      }
      if (fnName === "twMerge" || fnName === "tailwindMerge") {
        for (const arg of node.arguments) {
          walk(arg);
        }
      }
    }
  }

  walk(expr);
  return out;
}

/**
 * @param {string} str
 * @returns {string[]}
 */
function splitClassTokens(str) {
  return str
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * @typedef {import('eslint').Rule.RuleContext} RuleContext
 * @param {import('estree').JSXOpeningElement} opening
 * @param {(token: string, source: string) => void} onToken
 */
function visitOpeningElementClassnames(opening, onToken) {
  const hasSpread = opening.attributes.some((a) => a.type === "JSXSpreadAttribute");
  if (hasSpread) return;

  for (const attr of opening.attributes) {
    if (attr.type !== "JSXAttribute") continue;
    if (!attr.name || attr.type !== "JSXAttribute") continue;
    const n = attr.name;
    if (n.type !== "JSXIdentifier") continue;
    if (!CLASS_ATTRS.has(n.name)) continue;
    const val = attr.value;
    if (!val) continue;

    if (val.type === "Literal" && typeof val.value === "string") {
      for (const t of splitClassTokens(val.value)) onToken(t, val.raw ?? val.value);
      continue;
    }

    if (val.type === "JSXExpressionContainer" && val.expression) {
      const strings = collectStringsFromExpression(val.expression);
      for (const s of strings) {
        for (const t of splitClassTokens(s)) onToken(t, s);
      }
    }
  }
}

module.exports = {
  CLASS_ATTRS,
  collectStringsFromExpression,
  splitClassTokens,
  visitOpeningElementClassnames,
};
