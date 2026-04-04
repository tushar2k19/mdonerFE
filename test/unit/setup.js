/* global jest */
// jsdom does not implement ResizeObserver; NewTentativeDashboard mounted() uses it.
global.ResizeObserver = class ResizeObserver {
  observe () {}
  unobserve () {}
  disconnect () {}
}
