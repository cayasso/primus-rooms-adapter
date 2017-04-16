'use strict'

const createWildcard = require('./wildcard')

module.exports = exports = options => {
  options = options || {}
  const wildcard = options.wildcard ? createWildcard() : false
  const toArray = o => (o && Array.from(o)) || []
  const rooms = new Map()
  const socks = new Map()

  /**
   * Get rooms a socket is subscribed to or all rooms.
   *
   * @param {String} id
   * @return {Array}
   * @public
   */
  async function get(id) {
    return toArray(id ? socks.get(id) : rooms.keys())
  }

  /**
   * Add a socket to a room.
   *
   * @param {String} id
   * @param {String} room
   * @public
   */
  async function add(id, room) {
    const srooms = socks.get(id) || new Set()
    const rsocks = rooms.get(room) || new Set()
    socks.set(id, srooms.add(room))
    rooms.set(room, rsocks.add(id))
    if (wildcard) wildcard.add(room)
  }

  /**
   * Remove a socket from a room or from all rooms if a room is not passed.
   *
   * @param {String} id
   * @param {String} [room]
   * @public
   */
  async function del(id, room) {
    const srooms = socks.get(id)
    if (!srooms) return
    if (!room) return srooms.forEach(rm => prune(id, rm))

    if (wildcard && room.includes('*')) {
      wildcard.find(room, srooms, rm => prune(id, rm))
    } else if (srooms.has(room)) {
      prune(id, room)
    }
  }

  /**
   * Get ids of sockets connected to a given room.
   *
   * @param {String} room
   * @return {Array}
   * @public
   */
  async function clients(room) {
    return toArray(rooms.get(room))
  }

  /**
   * Remove all sockets from a room.
   *
   * @param {(String|Array)} room
   * @public
   */
  async function empty(room) {
    if (Array.isArray(room)) room.forEach(clear)
    else clear(room)
  }

  /**
   * Clear a room.
   *
   * @param {String} room
   * @private
   */
  function clear(room) {
    const rsocks = rooms.get(room)
    if (!rsocks) return;
    rsocks.forEach(id => {
      const srooms = socks.get(id)
      srooms.delete(room)
      if (!srooms.size) socks.delete(id)
    })
    rooms.delete(room)
    if (wildcard) wildcard.remove(room)
  }

  /**
   * Broadcast a packet.
   *
   * @param {Array} data Packet to broadcast
   * @param {Object} options Broadcast options
   * @param {Array} options.except Socket ids to exclude
   * @param {Array} options.rooms Rooms to broadcast to
   * @param {String} options.method Socket method to use: 'write' or 'send'
   * @param {Function} options.transformer Optional message transformer
   * @param {Object} clients Connected clients
   * @public
   */
  async function broadcast(data, options, clients) {
    options = options || {}
    const rms = options.rooms || []
    const sent = new Set()
    if (rms.length !== 0) {
      rms.forEach(room => {
        const ids = rooms.get(room)
        if (ids) send(sent, ids, clients, data, options)
        if (wildcard) wildcard.match(room, pattern => {
          send(sent, rooms.get(pattern), clients, data, options)
        })
      })
    } else {
      send(sent, toArray(socks.keys()), clients, data, options)
    }
  }

  /**
   * Send data.
   *
   * @param {Set} sent Keep track of already handled sockets
   * @param {Set} ids Socket ids
   * @param {Object} clients Connected clients
   * @param {Array} data Packet to send
   * @param {Object} options Send options
   * @param {Array} options.except Socket ids to exclude
   * @param {String} options.method Socket method to use: 'write' or 'send'
   * @param {Function} options.transformer Optional message transformer
   * @private
   */
  function send(sent, ids, clients, data, options) {
    const except = options.except || []
    const method = options.method || 'write'
    const transformer = options.transformer
    ids.forEach(id => {
      const socket = clients[id]
      if (!socket || ~except.indexOf(id) || sent.has(id)) return
      sent.add(id)
      transform(socket, data, method, transformer)
    })
  }

  /**
   * Execute message transformer and send data.
   *
   * @param {Spark} socket
   * @param {Mixed} data
   * @param {String} method
   * @param {Function} transformer
   * @private
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
   * Remove a socket from a room.
   *
   * @param {String} id
   * @param {String} room
   * @private
   */
  function prune(id, room) {
    const srooms = socks.get(id)
    const rsocks = rooms.get(room)

    srooms.delete(room)
    if (!srooms.size) socks.delete(id)

    rsocks.delete(id)
    if (!rsocks.size) {
      rooms.delete(room)
      if (wildcard) wildcard.remove(room)
    }
  }

  return { get, add, del, clients, broadcast, empty }
}
