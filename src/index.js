'use strict'

import createWildcard from './wild'

const isArray = Array.isArray
const keys = Object.keys

export default options => {
  const wild = createWildcard({ enabled: options.wildcard })

  let rooms = {}
  let sids = {}

  /**
   * Get rooms socket is subscribed to.
   *
   * @param {String} id
   * @param {Function} [fn]
   * @api public
   */

  function get(id, fn = noop) {
    let rms = keys(id ? sids[id] || {} : rooms)
    setImmediate(fn, null, rms)
  }

  /**
   * Add a socket to a room.
   *
   * @param {String} id
   * @param {String} room
   * @param {Function} [fn]
   * @api public
   */

  function add(id, room, fn = noop) {
    sids[id] = sids[id] || []
    sids[id][room] = true
    rooms[room] = rooms[room] || {}
    rooms[room][id] = true
    wild.add(room)
    setImmediate(fn, null, null)
  }

  /**
   * Remove a socket from a room or from all rooms if a room is not passed.
   *
   * @param {String} id
   * @param {String} room
   * @param {Function} [fn]
   * @api public
   */

  function del(id, room, fn = noop) {
    let prune = pruner(id)
    if (room) {
      if (wildcard && ~room.indexOf('*')) {
        let rms = keys(id ? sids[id] || {} : rooms)
        wild.find(room, rms, prune)
      } else if (sids[id] && sids[id][room]) {
        prune(room)
      }
    } else {
      for (room in sids[id]) prune(room)
    }
    setImmediate(fn, null, null)
  }

  /**
   * Get client ids connected to this room.
   *
   * @param {String} room
   * @param {Function} fn
   * @api public
   */

  function clients(room, fn = noop) {
    room = rooms[room] || {}
    setImmediate(fn, null, keys(room))
  }

  /**
   * Remove all sockets from a room.
   *
   * @param {String|Array} room
   * @param {Function} [fn]
   * @api public
   */

  function empty(room, fn = noop) {
    if (room && rooms[room]) {
      if (!isArray(room)) clear(room)
      else for (const rm of room) clear(rm)
    }
    setImmediate(fn, null, null)
  }

  /**
   * Reset all rooms or a particular room.
   *
   * @param {String} room
   * @param {Function} [fn]
   * @api public
   */

  function clear(room, fn = noop) {
    if ('function' === typeof room) {
      rooms = {}, sids = {}
    }
    for (const id in rooms[room]) {
      delete sids[id][room]
    }
    delete rooms[room]
    wild.remove(room)
    setImmediate(fn, null, null)
  }

  /**
   * Broadcast a packet.
   *
   * Options:
   *  - `except` {Array} sids that should be excluded
   *  - `rooms` {Array} list of rooms to broadcast to
   *  - `method` {String} 'write' or 'send' if primus-emitter is present
   *
   * @param {Object} data
   * @param {Object} opts
   * @param {Object} clients Connected clients
   * @api public
   */

  function broadcast(data, options = {}, clients) {
    let rms = options.rooms || []
    if (!rms.length) {
      return send(sids, clients, data, options)
    }
    for (const room of rms) {
      let ids = rooms[room]
      if (ids) send(ids, clients, data, options)
      wild.match(room, key =>
        send(rooms[key], clients, data, options)
    }
  }

  /**
   * Create sender.
   *
   * @param {Array} clients
   * @param {Mixed} data
   * @param {Object} options
   * @api private
   */

  function send(ids, clients, data, options) {
    const { except = [], method = 'writer', transformer } = options
    let sent = {}
    for (let id in ids) {
      const socket = clients[id]
      if (sent[id] || ~except.indexOf(id) || !socket) continue
      transform(socket, data, method, transformer)
      sent[id] = true
    }
  }

  /**
   * Execute message transformation.
   *
   * @param {Spark} socket
   * @param {Mixed} data
   * @param {String} method
   * @param {Function} transformer
   * @api public
   */

  function transform(socket, data, method, transformer) {
    if ('function' !== typeof transformer) {
      return socket[method].apply(socket, data)
    }

    let packet = {}

    try {
      packet.data = JSON.parse(JSON.stringify(data))
    } catch(e) {
      return socket.emit('error', e)
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

  function pruner(id) {
    return room => {
      delete sids[id][room]
      if (!keys(sids[id]).length) delete sids[id]
      delete rooms[room][id]
      if (!keys(rooms[room]).length) {
        delete rooms[room]
        wild.remove(room)
      }
    }
  }

  return { get, add, del, client, empty, clear, transform }
}
