'use strict'
const path = require('path')

module.exports = {
  rootDir: path.resolve(__dirname, '../..'),
  moduleFileExtensions: ['js', 'json', 'vue'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.js$': '<rootDir>/node_modules/babel-jest',
    '^.+\\.vue$': '<rootDir>/node_modules/vue-jest'
  },
  snapshotSerializers: ['<rootDir>/node_modules/jest-serializer-vue'],
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
  testMatch: ['**/test/unit/specs/**/*.spec.js'],
  // Vue 2 + old stack: mapCoverage removed in Jest 25+
  coveragePathIgnorePatterns: ['/node_modules/']
}
