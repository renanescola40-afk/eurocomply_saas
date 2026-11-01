'use strict';

const core = require('minimatch-core');
const minimatch = core.minimatch;

if (typeof minimatch !== 'function' || typeof core.Minimatch !== 'function') {
  throw new TypeError('minimatch-core 11 must export minimatch and Minimatch');
}

module.exports = minimatch;
Object.assign(module.exports, core);
module.exports.default = minimatch;
