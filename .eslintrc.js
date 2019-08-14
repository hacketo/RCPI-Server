module.exports = {
    "env": {
        "node": true,
        "mocha": true,
        "es6": true,

        // Disable default dom API...no global 'name', 'parent', 'self', 'origin', 'title' ...
        // that are already defined and so will cause linter to not fail
        "browser": false
    },
    "plugins": [
        //chai uses unused-expressions a lot, overrides it only on chai,
        // used with rules : no-unused-expressions": 0, "chai-friendly/no-unused-expressions": 2
        "chai-friendly"
    ],
    "extends": [
        "eslint:recommended",
        "eslint-config-closure-es6"
    ],
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parserOptions": {
        "sourceType": "module"
    },
    "rules":{
        "space-before-blocks": "off",
        "camelcase": "off",
        "closure/camelcase": "off",
        "max-len": "off",
        "brace-style": "off",
        "spaced-comment": "off",
        "no-inner-declarations": "off",
        "consistent-return": "off",
        "prefer-template": "off",
        "prefer-spread": "off",
        // see plugins/chai-friendly docs
        "closure/no-unused-expressions": 0,
        "chai-friendly/no-unused-expressions": 2
    }
};