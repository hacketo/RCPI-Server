module.exports = {
    "env": {
        "node": true,
        "es6": true
    },
    "extends": [
        "eslint:recommended"
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
        "consistent-return": "off"
    }
};