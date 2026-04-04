'use strict'
module.exports = {
  NODE_ENV: '"production"',
  FEATURE_MEETING_DASHBOARD: process.env.FEATURE_MEETING_DASHBOARD === 'true' ? '"true"' : '"false"'
}
