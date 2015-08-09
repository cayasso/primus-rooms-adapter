'use strict';

/**
 * Code inpired mainly by the socket.io 1.0 adapter
 */

var isArray = Array.isArray
  , extend = require('extendible')
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
 * @param {Object} options
 * @return {Adapter}
 * @api public
 */

function Adapter(options) {
  Emitter.call(this);

  options = options || {};

  this.rooms = {};
  this.sids = {};
  this.fns = [];

  this.wildDelete = 'wildDelete' in options
    ? options.wildDelete : false;

  this.use(wildcard, {
    enabled: 'wildcard' in options
      ? options.wildcard : true
  });
}

/**
 * Inherit from `EventEmitter`.
 */

Adapter.prototype = Object.create(Emitter.prototype, {
  constructor: { value: Adapter }
});

/**
 * Add a socket to a room.
 *
 * @param {String} id Socket id
 * @param {String} room The room name
 * @param {Function} [fn] Callback
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
 * @param {Function} [fn] Callback
 * @return {Array}
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
 * Remove a socket from a room or from all rooms
 * if a room is not passed.
 *
 * @param {String} id Socket id
 * @param {String} [room] The room name
 * @param {Function} [fn] Callback
 * @api public
 */

Adapter.prototype.del = function del(id, room, fn) {
  var adapter = this
    , ids = this.sids
    , rooms = this.rooms;

  ids[id] = ids[id] || {};

  if (room) {
    rooms[room] = rooms[room] || {};

    if (this.wildDelete && ~room.indexOf('*')) {
      adapter.wildcard.find(room, this.get(id), prune);
    } else {
      prune(room);
    }
  } else {
    for (room in ids[id]) prune(room);
  }

  if (fn) process.nextTick(fn.bind(null, null));

  function prune(room) {
    delete ids[id][room];
    if (!Object.keys(ids[id]).length) delete ids[id];

    delete rooms[room][id];
    if (!Object.keys(rooms[room]).length) {
      delete rooms[room];
      adapter.wildcard.remove(room);
    }
  }
};

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

Adapter.prototype.broadcast = function broadcast(data, opts, clients) {
  opts = opts || {};

  var sent = {}
    , adapter = this
    , rooms = opts.rooms || []
    , except = opts.except || []
    , method = opts.method || 'write'
    , transformer = opts.transformer
    , length = rooms.length;

  if (!length) return send(this.sids);

  rooms.forEach(function each(room) {
    var ids = adapter.rooms[room];

    if (ids) send(ids);
    adapter.wildcard.match(room, function match(key) {
      ids = adapter.rooms[key];
      if (ids) send(ids);
    });
  });

  function send(ids) {
    var socket;

    for (var id in ids) {
      if (sent[id] || ~except.indexOf(id)) continue;
      socket = clients[id];
      if (socket) {
        adapter.transform(socket, data, method, transformer);
        sent[id] = true;
      }
    }
  }
};

/**
 * Execute message transformation.
 *
 * @param {Spark} socket
 * @param {Mixed} data
 * @param {String} method
 * @param {Function} transformer
 * @returns {Primus}
 * @api public
 */

Adapter.prototype.transform = function transform(socket, data, method, transformer) {
  var packet = { data: data };

  if (!transformer || 'function' !== typeof transformer) {
    return send();
  }

  if (1 === transformer.length) {
    if (false === transformer.call(socket, packet)) return;
    return send();
  }

  transformer.call(socket, packet, function next(err, arg) {
    if (err) socket.emit('error', err);
    else if (false !== arg) send();
  });

  function send() {
    socket[method].apply(socket, packet.data);
  }
  return this;
};

/**
 * Get client ids connected to this room.
 *
 * @param {String} room The room name
 * @param {Function} [fn] Callback
 * @return {Array} clients
 * @api public
 */

Adapter.prototype.clients = function clients(room, fn) {
  var _room = this.rooms[room]
    , ids = _room ? Object.keys(_room) : [];

  if (fn) process.nextTick(function tick() {
    fn(null, ids);
  });
  return ids;
};

/**
 * Remove all sockets from a room.
 *
 * @param {String|Array} room
 * @param {Function} [fn] Callback
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
    for (; i < len; ++i) clear(room[i]);
  } else {
    clear(room);
  }

  if (fn) process.nextTick(fn.bind(null, null));

  function clear(room) {
    for (var id in rooms[room]) delete ids[id][room];
    delete rooms[room];
    adapter.wildcard.remove(room);
  }
};

/**
 * Check if a room is empty.
 *
 * @param {String} room
 * @param {Function} [fn] Callback
 * @return {Boolean}
 * @api public
 */

Adapter.prototype.isEmpty = function isEmpty(room, fn) {
  var ids = this.rooms[room];

  if (fn) process.nextTick(function tick() {
    fn(null, !ids);
  });
  return !ids;
};

/**
 * Reset the store.
 *
 * @param {Function} [fn] Callback
 * @api public
 */

Adapter.prototype.clear = function empty(fn) {
  this.rooms = {};
  this.sids = {};
  if (fn) process.nextTick(fn.bind(null, null));
  return this;
};

/**
 * Use the given `plugin`.
 *
 * @param {Function} plugin
 */

Adapter.prototype.use = function use(plugin) {
  if ('function' !== typeof plugin) {
    throw new AdapterError('`plugin` should be a function');
  }

  var args = [].slice.call(arguments, 1);
  args.unshift(this);
  plugin.apply(this, args);
};

// Make adapter extendable.
Adapter.extend = extend;
