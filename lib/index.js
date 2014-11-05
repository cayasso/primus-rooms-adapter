'use strict';

/**
 * Code inpired mainly by the socket.io 1.0 adapter
 */

var isArray = Array.isArray
  , extend = require('extendable')
  , AdapterError = require('./error')
  , Emitter = require('eventemitter3')
  , wildcard = require('./plugins/wildcard');

/**
 * Module exports.
 */

module.exports = Adapter;

/**
 * Memory adapter constructor.
 *
 * @param {Server} srv
 * @api public
 */

function Adapter(options) {
  options = options || {};
  
  this.rooms = {};
  this.sids = {};

  this.wildDelete = 'wildDelete' in options 
    ? options.wildDelete : false;

  this.use(wildcard, {
    enabled: 'wildcard' in options 
      ? options.wildcard : true    
  });
}

/**
 * Inherits from `EventEmitter`.
 */

Adapter.prototype.__proto__ = Emitter.prototype;

/**
 * Adds a socket to a room.
 *
 * @param {String} id Socket id
 * @param {String} room The room name
 * @param {Function} fn Callback
 * @api public
 */

Adapter.prototype.add = 
Adapter.prototype.set = function set(id, room, fn) {
  this.sids[id] = this.sids[id] || {};
  this.sids[id][room] = true;
  this.rooms[room] = this.rooms[room] || {};
  this.rooms[room][id] = true;
  this.wildcard.add(room);
  if (fn) process.nextTick(fn.bind(null, null));
};

/**
 * Get rooms socket is subscribed to.
 *
 * @param {String} id Socket id
 * @param {Function} fn callback
 * @api public
 */

Adapter.prototype.get = function get(id, fn) {
  var rooms = id ? this.sids[id] || {} : this.rooms;
  rooms = Object.keys(rooms);
  if (fn) process.nextTick(function tick() {
    fn(null, rooms);
  });
  return rooms;
};

/**
 * Removes a socket from a room or from all rooms 
 * if a room is not passed.
 *
 * @param {String} id Socket id
 * @param {String|Function} [room] The room name or callback
 * @param {Function} fn Callback
 * @api public
 */

Adapter.prototype.del = function del(id, room, fn) {

  var hasId
    , hasRoom
    , adapter = this
    , ids = this.sids
    , rooms = this.rooms;

  ids[id] = ids[id] || {};
  
  if (room) {
    
    rooms[room] = rooms[room] || {};

    if (this.wildDelete && ~room.indexOf('*')) {
      adapter.wildcard.find(room, this.get(id), del);
    } else {
      del(room);
    }
  } else {
    for (room in ids[id]) del(room);
  }

  if (fn) process.nextTick(fn.bind(null, null));

  function del(room) {
    delete ids[id][room];
    delete rooms[room][id];
    for (hasId in rooms[room]);
    for (hasRoom in ids[id]);
    if (!hasId) delete rooms[room];
    if (!hasRoom) delete ids[id];
    if (!hasId) adapter.wildcard.remove(room);
  }
};

/**
 * Broadcasts a packet.
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

Adapter.prototype.broadcast = function broadcast(data, opts, clients) {
  opts = opts || {};

  var socket
    , sent = {}
    , adapter = this
    , rooms = opts.rooms || []
    , except = opts.except || []
    , method = opts.method || 'write'
    , length = rooms.length;
    
  if (!length) return send(this.sids);

  for (var i = 0, ids, room; i < length; ++i) {
    room = rooms[i];
    
    if (ids = this.rooms[room]) {
      send(ids);
    }

    adapter.wildcard.match(room, function match(key) {
      if (adapter.rooms[key]) {
        send(adapter.rooms[key]);
      }
    });
  }

  function send(ids) {
    for (var id in ids) {
      if (sent[id] || ~except.indexOf(id)) continue;
      if (socket = clients[id]) {
        socket[method].apply(socket, data);
        sent[id] = true;
      }
    }
  }
};

/**
 * Get client ids connected to this room.
 *
 * @param {String} room The room name
 * @param {Function} fn Callback
 * @param {Array} clients
 * @api public
 */

Adapter.prototype.clients = function clients(room, fn) {
  var _room = this.rooms[room]
    , clients = _room ? Object.keys(_room) : [];
  if (fn) process.nextTick(function tick() {
    fn(null, clients);
  });
  return clients;
};

/**
 * Remove all sockets from a room.
 *
 * @param {String|Array} room
 * @param {Function} fn Callback
 * @api public
 */

Adapter.prototype.empty = function empty(room, fn) {

  var len
    , i = 0
    , adapter = this
    , ids = this.sids
    , rooms = this.rooms;

  rooms[room] = rooms[room] || {};

  if (isArray(room)) {
    len = room.length;
    for (; i < len; ++i) empty(room[i]);
  } else {
    empty(room);
  }

  if (fn) process.nextTick(fn.bind(null, null));

  function empty(room) {
    for (var id in rooms[room]) delete ids[id][room];
    delete rooms[room];
    adapter.wildcard.remove(room);
  }

};

/**
 * Check to see if a room is empty.
 *
 * @param {String} room
 * @param {Function} fn Callback
 * @api public
 */

Adapter.prototype.isEmpty = function isEmpty(room, fn) {
  var has, ids = this.rooms[room];
  if (ids) for (has in ids) break;
  if (fn) process.nextTick(function tick() {
    fn(null, !has);
  });
  return !has;
};

/**
 * Reset store.
 *
 * @param {Function} fn Callback
 * @api public
 */

Adapter.prototype.clear = function empty(fn) {
  this.rooms = {};
  this.sids = {};
  if (fn) process.nextTick(fn.bind(null, null));
};

/**
 * Use the given `plugin`.
 *
 * @param {Function} plugin
 * @return {Collection}
 */

Adapter.prototype.use = function use(plugin) {
  
  if ('function' !== typeof plugin) {
    throw new AdapterError('`plugin` should be a function');
  }

  var args = [].slice.call(arguments, 1);
  args.unshift(this);
  plugin.apply(this, args);
  return this;
};

// Make adapter extendable
Adapter.extend = extend;
