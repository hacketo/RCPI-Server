module.exports = {
    "env": {
        "node": true,
        "mocha": true,
        "es6": true
    },
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
        "prefer-template": "off"
    }
};