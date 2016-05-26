'use strict';

/**
 * Code inpired mainly by the socket.io 1.0 adapter.
 */

var extend = require('extendible')
  , AdapterError = require('./error')
  , wildcard = require('./plugins/wildcard');

/**
 * Module exports.
 */

module.exports = Adapter;

/**
 * Memory adapter constructor.
 *
 * @constructor
 * @param {Object} options
 * @return {Adapter}
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
 * Add a socket to a room.
 *
 * @param {String} id Socket id
 * @param {String} room Room name
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
  if (fn) setImmediate(fn, null);
};

/**
 * Get rooms socket is subscribed to.
 *
 * @param {String} id Socket id
 * @param {Function} [fn] Callback
 * @return {Array} Array of room names
 * @api public
 */

Adapter.prototype.get = function get(id, fn) {
  var rooms = id ? this.sids[id] || {} : this.rooms;
  rooms = Object.keys(rooms);
  if (fn) setImmediate(fn, null, rooms);
  return rooms;
};

/**
 * Remove a socket from a room or from all rooms if a room is not passed.
 *
 * @param {String} id Socket id
 * @param {String} room Room name
 * @param {Function} [fn] Callback
 * @api public
 */

Adapter.prototype.del = function del(id, room, fn) {
  var adapter = this
    , ids = this.sids
    , rooms = this.rooms;

  if (room) {
    if (this.wildDelete && ~room.indexOf('*')) {
      adapter.wildcard.find(room, this.get(id), prune);
    } else if (ids[id] && ids[id][room]) {
      prune(room);
    }
  } else {
    for (room in ids[id]) prune(room);
  }

  if (fn) setImmediate(fn, null);

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
 * @param {Object} data Data to broadcast
 * @param {Object} opts Broadcast options
 * @param {Array} opts.except Socket ids to exclude
 * @param {Array} opts.rooms List of rooms to broadcast to
 * @param {String} opts.method 'write' or 'send' if primus-emitter is present
 * @param {Function} opts.transformer Message transformer
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
 * @param {Spark} socket Spark reference
 * @param {Mixed} data Data to transform
 * @param {String} method 'write' or 'send' if primus-emitter is present
 * @param {Function} transformer Message transformer
 * @return {Adapter}
 * @api public
 */

Adapter.prototype.transform = function transform(socket, data, method, transformer) {

  var packet = { data: data };

  if (!transformer || 'function' !== typeof transformer) {
    return send();
  }

  try {
    packet.data = JSON.parse(JSON.stringify(data));
  } catch (e) {
    return socket.emit('error', e);
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
 * @param {String} room Room name
 * @param {Function} [fn] Callback
 * @return {Array} Array of spark ids
 * @api public
 */

Adapter.prototype.clients = function clients(room, fn) {
  var _room = this.rooms[room]
    , ids = _room ? Object.keys(_room) : [];

  if (fn) setImmediate(fn, null, ids);
  return ids;
};

/**
 * Remove all sockets from a room.
 *
 * @param {String|Array} room Room name
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

  if (Array.isArray(room)) {
    len = room.length;
    for (; i < len; ++i) clear(room[i]);
  } else {
    clear(room);
  }

  if (fn) setImmediate(fn, null);

  function clear(room) {
    for (var id in rooms[room]) delete ids[id][room];
    delete rooms[room];
    adapter.wildcard.remove(room);
  }
};

/**
 * Check if a room is empty.
 *
 * @param {String} room Room name
 * @param {Function} [fn] Callback
 * @return {Boolean} `true` if the room is empty, else `false`
 * @api public
 */

Adapter.prototype.isEmpty = function isEmpty(room, fn) {
  var ids = this.rooms[room];

  if (fn) setImmediate(fn, null, !ids);
  return !ids;
};

/**
 * Reset the store.
 *
 * @param {Function} [fn] Callback
 * @return {Adapter}
 * @api public
 */

Adapter.prototype.clear = function empty(fn) {
  this.rooms = {};
  this.sids = {};
  if (fn) setImmediate(fn, null);
  return this;
};

/**
 * Use the given `plugin`.
 *
 * @param {Function} plugin
 * @api public
 */

Adapter.prototype.use = function use(plugin) {
  if ('function' !== typeof plugin) {
    throw new AdapterError('`plugin` should be a function');
  }

  var args = Array.prototype.slice.call(arguments, 1);
  args.unshift(this);
  plugin.apply(this, args);
};

// Make adapter extendable.
Adapter.extend = extend;
