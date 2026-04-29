/**
 * Bans Tailwind default radius steps where MCA radius tokens exist.
 */

"use strict";

const { visitOpeningElementClassnames } = require("../lib/class-scan.cjs");

const RADIUS_RE = /\brounded-(?:md|lg|xl|2xl)\b/;

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow rounded-md/lg/xl/2xl — use rounded-mca-card, rounded-mca-panel, rounded-mca-block, etc.",
    },
    schema: [],
    messages: {
      banned: "Use MCA radius tokens (e.g. rounded-mca-block) instead of `{{token}}`.",
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        visitOpeningElementClassnames(node, (token) => {
          if (!RADIUS_RE.test(token)) return;
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
