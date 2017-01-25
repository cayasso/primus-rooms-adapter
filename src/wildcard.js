'use strict'

export default (options = {}) => {
  const { enabled = true } = options

  let keys = []

  /**
   * Match wildcard keys.
   *
   * @param {String} room
   * @param {Function} fn
   * @api public
   */

  function match(room, fn) {
    if (!enabled) return
    for (const key of keys) {
      if (regex(key).test(room)) fn(key)
    }
  }

  /**
   * Find keys matching wildcard.
   *
   * @param {String} room
   * @param {Array} [list]
   * @param {Function} [fn]
   * @api public
   */

  function find(re, list, fn) {
    if ('function' === typeof list) {
      fn = list
      list = null
    }
    if (!enabled) return fn(re)
    list = list || keys
    for (const key of list) {
      if (regex(re).test(key)) fn(key)
    }
  }

  /**
   * Add key to wildcard list.
   *
   * @param {String} key
   * @return {Boolean}
   * @api private
   */

  function add(key) {
    if (enabled
      && 'string' === typeof key
      && ~key.indexOf('*')
      && !~keys.indexOf(key)) {
      keys.push(key)
    }
  }

  /**
   * Remove key from wildcard list.
   *
   * @param {String} key
   * @return {Boolean}
   * @api private
   */

  function remove(key) {
    if (enabled
      && 'string' === typeof key
      && ~key.indexOf('*')) {
      var i = keys.indexOf(key)
      if (~i) keys.splice(i, 1)
    }
  }

  /**
   * Wild card regular expresion builder.
   *
   * @param {String} pattern
   * @param {RegEx}
   * @api private
   */

  function regex(pattern) {
    pattern = pattern.replace(/[\*]/g, '(.*?)')
    return new RegExp(`^${pattern}$`)
  }

  return { add, find, match, remove }
}
