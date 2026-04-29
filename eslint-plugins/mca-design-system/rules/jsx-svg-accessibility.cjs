/**
 * Phase 32 — inline SVG guardrails:
 * - Decorative SVGs must use aria-hidden="true" (and typically focusable="false").
 * - Semantic SVGs must use role="img" with aria-label or aria-labelledby.
 *
 * Skips when {...spread} is present (dynamic props).
 */

"use strict";

/**
 * @param {import('estree').JSXAttribute | import('estree').JSXSpreadAttribute} attr
 * @returns {string | null}
 */
function getJsxAttrName(attr) {
  if (attr.type !== "JSXAttribute" || !attr.name) return null;
  if (attr.name.type === "JSXIdentifier") return attr.name.name;
  return null;
}

/**
 * @param {import('estree').JSXAttribute} attr
 */
function isAriaHiddenTrue(attr) {
  if (getJsxAttrName(attr) !== "aria-hidden") return false;
  const v = attr.value;
  if (!v) return false;
  if (v.type === "Literal") return v.value === true || v.value === "true";
  if (v.type === "JSXExpressionContainer" && v.expression.type === "Literal") {
    return v.expression.value === true || v.expression.value === "true";
  }
  return false;
}

/**
 * @param {import('estree').JSXOpeningElement} opening
 */
function hasSpread(opening) {
  return opening.attributes.some((a) => a.type === "JSXSpreadAttribute");
}

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Inline SVGs should be aria-hidden (decorative) or role=img with an accessible name.",
    },
    schema: [],
    messages: {
      missing:
        "Inline <svg> must set aria-hidden=\"true\" for decorative icons, or role=\"img\" with aria-label / aria-labelledby for meaningful graphics.",
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== "JSXIdentifier" || node.name.name !== "svg") return;
        if (hasSpread(node)) return;

        let ariaHidden = false;
        let roleImg = false;
        let hasName = false;

        for (const attr of node.attributes) {
          if (attr.type !== "JSXAttribute") continue;
          const n = getJsxAttrName(attr);
          if (n === "aria-hidden" && isAriaHiddenTrue(attr)) {
            ariaHidden = true;
          }
          if (n === "role" && attr.value && attr.value.type === "Literal" && attr.value.value === "img") {
            roleImg = true;
          }
          if (n === "aria-label" || n === "aria-labelledby") {
            hasName = true;
          }
        }

        if (ariaHidden) return;
        if (roleImg && hasName) return;

        context.report({ node, messageId: "missing" });
      },
    };
  },
};
