'use strict';

/**
 * Code inpired mainly by the socket.io 1.0 adapter
 */

var isArray = Array.isArray
  , extend = require('extendable')
  , Emitter = require('eventemitter3');

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
  this.wildcard = 'wildcard' in options ? options.wildcard : true;
  this.rooms = {};
  this.sids = {};
  this.keys = [];
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

  //room = regex(room);

  this.sids[id] = this.sids[id] || {};
  this.sids[id][room] = true;
  this.rooms[room] = this.rooms[room] || {};
  this.rooms[room][id] = true;
  this.keys = this.keys || [];
  
  if (this.wildcard && room && !~this.keys.indexOf(room)) {
    this.keys.push(room);  
  }

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
    , ids = this.sids
    , rooms = this.rooms
    , keys = this.keys;

  ids[id] = ids[id] || {};
  
  if (room) {
    rooms[room] = rooms[room] || {};
    del(room);
  } else {
    for (room in ids[id]) del(room);
  }

  if (fn) process.nextTick(fn.bind(null, null));

  function del(room) {    
    delete ids[id][room];
    delete rooms[room][id];
    
    var i = keys.indexOf(room);
    if (~i) keys.splice(i, 1);

    for (hasId in rooms[room]);
    for (hasRoom in ids[id]);

    if (!hasId) delete rooms[room];
    if (!hasRoom) delete ids[id];
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
    , keys = this.keys
    , keysLen = keys.length
    , rooms = opts.rooms || []
    , except = opts.except || []
    , method = opts.method || 'write'
    , roomsLen = rooms.length;
    
  if (!roomsLen) return send(this.sids);

  for (var i = 0, ids, room; i < roomsLen; ++i) {
    room = rooms[i];
    if (ids = this.rooms[room]) {
      send(ids);
    }

    if (this.wildcard) {
      for (var j = 0, key; j < keysLen; ++j) {
        key = keys[j];
        ids = this.rooms[key]
        if (ids && regex(key).test(room)) {
          send(ids);
        }
      }
    }
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
 * Compare room keys with wildcard.
 *
 * @param {String} pattern
 * @param {RegEx}
 * @api private
 */

function regex(pattern) {
  pattern = pattern.replace(/[\*]/g, '(.*?)');
  return new RegExp('^' + pattern + '$');
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

// Make adapter extendable
Adapter.extend = extend;
