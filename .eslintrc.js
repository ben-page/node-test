module.exports = {
    'parserOptions': {
        'ecmaVersion': 6
    },
    'env': {
        'node': true,
        'browser': true,
		'es6': true
    },
    'root': true,
    'extends': 'eslint:recommended',
    'rules': {
		//Possible Errors
		'comma-dangle': [ 'error', 'only-multiline' ],
		'no-console': 'off',
		'no-extra-parens': [ 'error', 'functions' ],
		
		//Best Practices
		'consistent-return': 'error',
		'curly': [ 'warn', 'multi-or-nest', 'consistent' ],
		//'curly': [ 'warn', 'multi-or-nest', {consistent: true, allowExtra: true} ],
		'dot-notation': [ 'error', { allowKeywords: true } ],
		'eqeqeq': 'error',
		'no-alert': 'error',
		'no-caller': 'error',
		'no-eval': 'error',
		'no-extend-native': 'error',
		'no-extra-bind': 'error',
		'no-fallthrough': 'error',
		'no-implied-eval': 'error',
		'no-iterator': 'error',
		'no-labels': [ 'error', { allowLoop: true, allowSwitch: true } ],
		'no-lone-blocks': 'error',
		'no-loop-func': 'error',
		'no-multi-spaces': 'error',
		'no-multi-str': 'error',
		'no-native-reassign': 'error',
		'no-new': 'error',
		'no-new-wrappers': 'error',
		'no-octal': 'error',
		'no-octal-escape': 'error',
		'no-proto': 'error',
		'no-redeclare': 'error',
		'no-script-url': 'error',
		'no-self-assign': 'error',
		'no-sequences': 'error',
		'no-unused-expressions': 'error',
		'no-with': 'error',
		'yoda': [ 'error', 'never' ],
		
		//Strict Mode
		'strict': [ 'error', 'global' ],
		
		//Variables
		'no-catch-shadow': 'error',
		'no-label-var': 'error',
		'no-shadow': 'error',
		'no-shadow-restricted-names': 'error',
		'no-undef': 'error',
		'no-undef-init': 'error',
		'no-unused-vars': [ 'error', { args: 'none' } ],
		'no-use-before-define': ['error', {'functions': false} ],
		
		//Node.js and CommonJS
		'no-mixed-requires': 'error',
		'no-new-require': 'error',
		'no-path-concat': 'error',
		'no-process-exit': 'error',
		'no-restricted-modules': 'error',
		
		//Stylistic Issues
		'camelcase': 'error',
		'indent': [ 'error', 4, { SwitchCase: 1 } ],
		'key-spacing': [ 'error', { beforeColon: false, afterColon: true } ],
		'linebreak-style': [ 'error', 'unix' ],
		'max-statements-per-line': 'error',
		'new-cap': [ 'error', {'properties': false} ],
		'new-parens': 'error',
		'no-array-constructor': 'error',
		'no-new-object': 'error',
		'quotes': [ 'error', 'single' ],
		
		//ECMAScript 6
		'constructor-super': 'error',
		'no-var': 'error',
		'prefer-const': [ 'error', { 'destructuring': "all" } ],
		'template-curly-spacing': 'error',
		
    }
};