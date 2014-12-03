'use strict';

/**
 * Module exports.
 */

module.exports = plugin;

/**
 * Wildcard plugin.
 *
 * @param {Adapter} adapter
 * @param {Object} options
 * @return {Object}
 * @api public
 */

function plugin(adapter, options) {

  // Make sure we have a adapter.
  adapter = adapter || {};
  options = options || {};

  /**
   * Main wildcard namespace.
   *
   * @type {Object} obj
   * @api public
   */

  var wildcard = {};

  /**
   * Wildcard keys.
   *
   * @type {Array}
   * @api private
   */

  var keys = [];

  /**
   * Hold Wildcard enable.
   *
   * @typem {Boolean}
   * @api public
   */

  wildcard.enabled = 'enabled' in options
    ? options.enabled : true;

  /**
   * Match wildcard keys.
   *
   * @param {String} room
   * @param {Function} fn
   * @api public
   */

  wildcard.match = function match(room, fn) {
    if (!wildcard.enabled) return;
    var key, i = 0, len = keys.length;
    for (; i < len; ++i) {
      key = keys[i];
      if (regex(key).test(room)) fn(key);
    }
  };

  /**
   * Find keys matching wildcard.
   *
   * @param {String} room
   * @param {Array} [list]
   * @param {Function} [fn]
   * @api public
   */

  wildcard.find = function find(re, list, fn) {
    if ('function' === typeof list) {
      fn = list;
      list = null;
    }
    if (!wildcard.enabled) return fn(re);
    list = list || keys;
    var key, i = 0, len = list.length;
    for (; i < len; ++i) {
      key = list[i];
      if (regex(re).test(key)) fn(key);
    }
  };

  /**
   * Add key to wildcard list.
   *
   * @param {String} key
   * @return {Boolean}
   * @api private
   */

  wildcard.add = function add(key) {
    if (wildcard.enabled
      && 'string' === typeof key
      && ~key.indexOf('*')
      && !~keys.indexOf(key)) {
      keys.push(key);
    }
  };

  /**
   * Remove key from wildcard list.
   *
   * @param {String} key
   * @return {Boolean}
   * @api private
   */

  wildcard.remove = function remove(key) {
    if (!wildcard.enabled) return;
    if ('string' === typeof key
      && ~key.indexOf('*')) {
      var i = keys.indexOf(key);
      if (~i) keys.splice(i, 1);
    }
  };

  /**
   * Wild card regular expresion builder.
   *
   * @param {String} pattern
   * @param {RegEx}
   * @api private
   */

  function regex(pattern) {
    pattern = pattern.replace(/[\*]/g, '(.*?)');
    return new RegExp('^' + pattern + '$');
  }

  // Expose wildcard namespace.
  adapter.wildcard = wildcard;
  return wildcard;
}
