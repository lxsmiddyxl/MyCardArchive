/**
 * Bans raw Tailwind palette color utilities for MCA-owned scales (zinc, emerald, amber, rose, sky, violet).
 * Use semantic `mca-*` colors instead.
 */

"use strict";

const { visitOpeningElementClassnames } = require("../lib/class-scan.cjs");

const PALETTE_RE =
  /\b(text|bg|border|from|via|to|ring|stroke|fill|outline|decoration|divide)-(zinc|emerald|amber|rose|sky|violet)-/;

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow raw Tailwind zinc/emerald/amber/rose/sky/violet palette utilities; use text-mca-*, bg-mca-*, border-mca-*.",
    },
    schema: [],
    messages: {
      banned:
        "MCA design system: do not use Tailwind palette class `{{token}}`. Prefer semantic `mca-*` color tokens.",
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        visitOpeningElementClassnames(node, (token) => {
          if (!PALETTE_RE.test(token)) return;
          context.report({
            node,
            messageId: "banned",
            data: { token },
          });
        });
      },
    };
  },
};
