'use strict'

module.exports = exports = () => {
  const patterns = new Set()

  /**
   * Find all patterns matching a given room.
   *
   * @param {String} room
   * @param {Function} fn
   * @public
   */
  function match(room, fn) {
    patterns.forEach(pattern => {
      if (regex(pattern).test(room)) fn(pattern)
    })
  }

  /**
   * Find all rooms matching a given pattern.
   *
   * @param {String} pattern
   * @param {Array} rooms
   * @param {Function} fn
   * @public
   */
  function find(pattern, rooms, fn) {
    rooms.forEach(room => {
      if (regex(pattern).test(room)) fn(room)
    })
  }

  /**
   * Add a pattern to patterns set.
   *
   * @param {String} pattern
   * @return {(Set|undefined)}
   * @public
   */
  function add(pattern) {
    if ('string' === typeof pattern && pattern.includes('*')) {
      patterns.add(pattern)
    }
  }

  /**
   * Remove a pattern from patterns set.
   *
   * @param {String} pattern
   * @return {(Boolean|undefined)}
   * @public
   */
  function remove(pattern) {
    if ('string' === typeof pattern && ~pattern.includes('*')) {
      patterns.delete(pattern)
    }
  }

  /**
   * Wild card regular expresion builder.
   *
   * @param {String} pattern
   * @param {RegEx}
   * @private
   */
  function regex(pattern) {
    pattern = pattern.replace(/[*]/g, '(.*?)')
    return new RegExp(`^${pattern}$`)
  }

  return { add, find, match, remove }
}
