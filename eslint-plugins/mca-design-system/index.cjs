"use strict";

module.exports = {
  rules: {
    "no-palette-primitives": require("./rules/no-palette-primitives.cjs"),
    "no-legacy-border-radius": require("./rules/no-legacy-border-radius.cjs"),
    "no-legacy-shadow": require("./rules/no-legacy-shadow.cjs"),
    "no-default-scale-spacing": require("./rules/no-default-scale-spacing.cjs"),
    "jsx-svg-accessibility": require("./rules/jsx-svg-accessibility.cjs"),
  },
};
