/**
 * Bans Tailwind default shadow steps where MCA shadows exist.
 */

"use strict";

const { visitOpeningElementClassnames } = require("../lib/class-scan.cjs");

const SHADOW_RE = /\bshadow-(?:sm|md|lg)\b/;

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow shadow-sm/md/lg — use shadow-mca-card or shadow-mca-panel.",
    },
    schema: [],
    messages: {
      banned: "Use MCA shadow tokens (`shadow-mca-card`, `shadow-mca-panel`) instead of `{{token}}`.",
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        visitOpeningElementClassnames(node, (token) => {
          const m = token.match(SHADOW_RE);
          if (!m) return;
          context.report({
            node,
            messageId: "banned",
            data: { token: m[0] },
          });
        });
      },
    };
  },
};
