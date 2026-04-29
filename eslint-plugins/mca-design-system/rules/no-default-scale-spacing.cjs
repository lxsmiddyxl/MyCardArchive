/**
 * Bans Tailwind default numeric spacing scale (p-4, gap-8, space-y-4, …) when MCA spacing exists.
 * Zero utilities (p-0, gap-0, …) are allowed.
 * Arbitrary values `p-[13px]` are allowed as an escape hatch.
 */

"use strict";

const { visitOpeningElementClassnames } = require("../lib/class-scan.cjs");

/** Prefix utilities like p-/m-/gap-/space-* using Tailwind default scale (digits or decimals), excluding mca-* */
const DEFAULT_SPACING_RE =
  /^(?:[a-zA-Z0-9-_[\]%&]+:)*((?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|space-x|space-y)-(?!mca-)(?:\d+(?:\.\d+)?))(?:\/\d+)?$/;

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Prefer MCA spacing utilities (e.g. px-mca-compact, gap-mca-sm) over default p-/gap- digits.",
    },
    schema: [],
    messages: {
      banned:
        "Prefer MCA spacing tokens (`{{suggest}}` or similar) instead of default scale class `{{token}}`.",
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        visitOpeningElementClassnames(node, (token) => {
          // `file:mr-4` etc. are file-input pseudo utilities, not general spacing.
          if (/^file:/.test(token)) return;
          const m = token.match(DEFAULT_SPACING_RE);
          if (!m) return;
          const base = m[1];
          if (base.includes("[")) return;
          const num = base.split("-").pop();
          if (num === "0" || num === "0.0") return;

          context.report({
            node,
            messageId: "banned",
            data: { token, suggest: "p-mca-* / gap-mca-* / space-y-mca-* (see src/styles/tokens/spacing.ts)" },
          });
        });
      },
    };
  },
};
