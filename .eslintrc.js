// https://eslint.org/docs/user-guide/configuring

module.exports = {
  root: true,
  parserOptions: {
    parser: 'babel-eslint'
  },
  env: {
    browser: true,
  },
  extends: [
    // https://github.com/vuejs/eslint-plugin-vue#priority-a-essential-error-prevention
    // consider switching to `plugin:vue/strongly-recommended` or `plugin:vue/recommended` for stricter rules.
    'plugin:vue/essential', 
    // https://github.com/standard/standard/blob/master/docs/RULES-en.md
    'standard'
  ],
  // required to lint *.vue files
  plugins: [
    'vue'
  ],
  // add your custom rules here
  rules: {
    // allow async-await
    'generator-star-spacing': 'off',
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    // Disable problematic rules that are causing build spam
    'space-before-function-paren': 'off',
    'no-trailing-spaces': 'off',
    'eol-last': 'off',
    'indent': 'off',
    'no-multiple-empty-lines': 'off',
    'padded-blocks': 'off',
    // Disable semicolon and comma rules that don't align with project style
    'semi': 'off',
    'comma-dangle': 'off',
    'space-infix-ops': 'off',
    'new-cap': 'off',
    'spaced-comment': 'off',
    // Additional rules that might cause issues
    'quotes': 'off',
    'no-unused-vars': 'warn', // Change to warning instead of error
    'vue/no-unused-components': 'warn'
  },
  // Meeting / new-flow components must not pull in legacy TaskModal or EnhancedNode* (regression guard).
  overrides: [
    {
      files: ['src/components/New*.vue'],
      rules: {
        'no-restricted-imports': ['error', {
          paths: [
            {
              name: './TaskModal.vue',
              message: 'New* flow: use NewTaskModal, not TaskModal.'
            },
            {
              name: './EnhancedNodeEditor.vue',
              message: 'New* flow: use NewEnhancedNodeEditor.'
            },
            {
              name: './EnhancedNodeItem.vue',
              message: 'New* flow: use NewEnhancedNodeItem.'
            },
            {
              name: '../components/TaskModal.vue',
              message: 'New* flow: use NewTaskModal, not TaskModal.'
            },
            {
              name: '../components/EnhancedNodeEditor.vue',
              message: 'New* flow: use NewEnhancedNodeEditor.'
            },
            {
              name: '../components/EnhancedNodeItem.vue',
              message: 'New* flow: use NewEnhancedNodeItem.'
            }
          ]
        }]
      }
    }
  ]
}
