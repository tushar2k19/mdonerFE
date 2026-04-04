'use strict'
const merge = require('webpack-merge')
const prodEnv = require('./prod.env')

module.exports = merge(prodEnv, {
  NODE_ENV: '"development"',
  // Default ON in dev for QA; set FEATURE_MEETING_DASHBOARD=false to force legacy nav only.
  FEATURE_MEETING_DASHBOARD: process.env.FEATURE_MEETING_DASHBOARD === 'false' ? '"false"' : '"true"'
})
