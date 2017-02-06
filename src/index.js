'use strict'

const createWildcard = require('./wildcard')

module.exports = exports = options => {
  options = options || {}
  const wildcard = options.wildcard
  const wild = createWildcard({ enabled: Boolean(wildcard) })
  const toArray = o => Array.from(o) || []
  const rooms = new Map()
  const socks = new Map()

  /**
   * Get rooms socket is subscribed to.
   *
   * @param {String} id
   * @api public
   */

  async function get(id) {
    return toArray(id ? socks.get(id) : rooms.keys())
  }

  /**
   * Add a socket to a room.
   *
   * @param {String} id
   * @param {String} room
   * @api public
   */

  async function add(id, room) {
    const srooms = socks.get(id) || new Set()
    const rsocks = rooms.get(room) || new Set()
    socks.set(id, srooms.add(room))
    socks.set(room, rsocks.add(id))
    wild.add(room)
  }

  /**
   * Remove a socket from a room or from all rooms if a room is not passed.
   *
   * @param {String} id
   * @param {String} room
   * @api public
   */

  async function del(id, room) {
    const srooms = socks.get(id)
    if (room) {
      if (wildcard && ~room.indexOf('*')) {
        const rms = id ? srooms : rooms.keys()
        wild.find(room, toArray(rms), rm => prune(id, rm))
      } else if (srooms && srooms.has(room)) {
        prune(id, room)
      }
    } else {
      srooms.forEach((val, rm) => prune(id, rm))
    }
  }

  /**
   * Get client ids connected to this room.
   *
   * @param {String} room
   * @api public
   */

  async function clients(room) {
    return toArray(rooms.get(room))
  }

  /**
   * Remove all sockets from a room.
   *
   * @param {String|Array} room
   * @api public
   */

  async function empty(room) {
    if (!rooms.get(room)) return
    if (!Array.isArray(room)) clear(room)
    room.forEach(clear)
  }

  /**
   * Reset all rooms or a particular room.
   *
   * @param {String} room
   * @api private
   */

  function clear(room) {
    const rsocks = rooms.get(room)
    rsocks.forEach(id => socks.get(id).clear())
    rsocks.clear()
    wild.remove(room)
  }

  /**
   * Broadcast a packet.
   *
   * Options:
   *  - `except` {Array} socks that should be excluded
   *  - `rooms` {Array} list of rooms to broadcast to
   *  - `method` {String} 'write' or 'send' if primus-emitter is present
   *
   * @param {Object} data
   * @param {Object} options
   * @param {Object} clients Connected clients
   * @api public
   */

  async function broadcast(data, options, clients) {
    options = options || {}
    const rms = options.rooms || []
    if (rms.length === 0) {
      rms.forEach(room => {
        const ids = rooms.get(room)
        if (ids) send(ids, clients, data, options)
        wild.match(room, key =>
          send(rooms.get(key), clients, data, options))
      })
    } else {
      send(toArray(socks.keys()), clients, data, options)
    }
  }

  /**
   * Create sender.
   *
   * @param {Set} ids
   * @param {Object} clients
   * @param {Mixed} data
   * @param {Object} options
   * @api private
   */

  function send(ids, clients, data, options) {
    const except = options.except || []
    const method = options.method || 'write'
    const transformer = options.transformer
    ids.forEach(id => {
      const socket = clients[id]
      if (~except.indexOf(id) || !socket) return
      transform(socket, data, method, transformer)
    })
  }

  /**
   * Execute message transformation.
   *
   * @param {Spark} socket
   * @param {Mixed} data
   * @param {String} method
   * @param {Function} transformer
   * @api private
   */

  function transform(socket, data, method, transformer) {
    if ('function' !== typeof transformer) {
      return socket[method].apply(socket, data)
    }

    const packet = {}

    try {
      packet.data = JSON.parse(JSON.stringify(data))
    } catch (err) {
      return socket.emit('error', err)
    }

    if (1 === transformer.length) {
      if (false === transformer.call(socket, packet)) return
      return socket[method].apply(socket, packet.data)
    }

    transformer.call(socket, packet, (err, arg) => {
      if (err) socket.emit('error', err)
      else if (false !== arg) socket[method].apply(socket, packet.data)
    })
  }

  /**
   * Create pruner.
   *
   * @param {String} id
   * @api private
   */

  function prune(id, room) {
    const srooms = socks.get(id)
    const rsocks = rooms.get(room)

    if (srooms) {
      srooms.delete(room)
      if (!srooms.size) socks.delete(id)
    }

    if (rsocks) {
      rsocks.delete(id)
      if (!rsocks.size) {
        rooms.delete(room)
        wild.remove(room)
      }
    }
  }

  return { get, add, del, clients, broadcast, empty }
}
