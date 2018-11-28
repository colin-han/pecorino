module.exports = {
  "extends": "airbnb/base",
  "env": {
    "node": true,
    "jest": true
  },
  "globals": {
    "$Subtype": false,
    "$Supertype": false,
    "Class": false,
    "$ReadOnlyArray": false,
  },
  "rules": {
    "max-len": ["error", {
      "code": 100,
      "tabWidth": 2,
      "ignoreComments": true,
      "ignoreStrings": true,
      "ignoreTemplateLiterals": true,
      "ignoreRegExpLiterals": true
    }],
    "arrow-parens": ["off"],
    "consistent-return": "off",
    "comma-dangle": "off",
    "function-paren-newline": ["error", "consistent"],
    "generator-star-spacing": "off",
    "import/no-unresolved": "error",
    "import/no-extraneous-dependencies": "off",
    "linebreak-style": "off",
    "no-console": "off",
    "no-plusplus": "off",
    "no-param-reassign": ["error", { "props": false }],
    "no-multi-assign": "off",
    "no-restricted-syntax": [
      "error",
      "LabeledStatement",
      "WithStatement"
    ],
    "no-underscore-dangle": ["error", { "allowAfterThis": true }],
    "no-use-before-define": "off",
    "object-curly-newline": ["error", { "consistent": true }],
    "operator-linebreak": ["error", "after"],
    "promise/param-names": "error",
    "promise/always-return": "off",
    "promise/catch-or-return": "error",
    "promise/no-native": "off"
  },
  "plugins": [
    "import",
    "promise"
  ],
  settings: {
    polyfills: ['fetch', 'promises']
  },
};
