'use strict'
const path = require('path')

module.exports = {
  rootDir: path.resolve(__dirname, '../..'),
  moduleFileExtensions: ['js', 'json', 'vue'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.css$': '<rootDir>/test/unit/cssStub.js'
  },
  transform: {
    '^.+\\.js$': '<rootDir>/node_modules/babel-jest',
    '^.+\\.vue$': '<rootDir>/node_modules/vue-jest'
  },
  snapshotSerializers: ['<rootDir>/node_modules/jest-serializer-vue'],
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
  // Allow vue-jest + babel to process v-calendar (imported as source .vue from NewTentativeDashboard).
  transformIgnorePatterns: ['/node_modules/(?!v-calendar/)'],
  setupTestFrameworkScriptFile: '<rootDir>/test/unit/setup.js',
  testMatch: ['**/test/unit/specs/**/*.spec.js'],
  // Vue 2 + old stack: mapCoverage removed in Jest 25+
  coveragePathIgnorePatterns: ['/node_modules/']
}
