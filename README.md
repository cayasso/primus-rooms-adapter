# primus-rooms-adapter

[![Build Status](https://img.shields.io/travis/cayasso/primus-rooms-adapter/master.svg)](https://travis-ci.org/cayasso/primus-rooms-adapter)
[![NPM version](https://img.shields.io/npm/v/primus-rooms-adapter.svg)](https://www.npmjs.com/package/primus-rooms-adapter)

In-memory default adapter for `primus-rooms`.

## Installation

```
$ npm install primus-rooms-adapter
```

## Usage

Use this adapter as an abstract class for creating your own custom 'primus-rooms' adapter.


```javascript

var util = require('util');
var Adapter = require('primus-rooms-adapter');

function MyAdapter() {
  Adapter.call(this);
}

util.inherits(MyAdapter, Adapter);

Adapter.prototype.broadcast = function broadcast(data, opts, clients) {
  // Do my custom broadcast here, it could be sending to a database
};

```

Then you can set your custom adapter for rooms, like this:

```javascript
primus.use('rooms', Rooms);

// by setting the property
primus.adapter = new MyAdapter();
```

or pass the adapter instance as argument to Primus like so:

```javascript
var myAdapter = new MyAdapter();
var primus = new Primus(url, {
  transformer: 'sockjs',
  rooms: { adapter: myAdapter }
});
```

## API (Abstract public methods).

### adapter.set(id, room, fn)

Adds a socket to a room.

### adapter.get(id, fn)

Get rooms socket is subscribed to.

### adapter.del(id, room, fn)

Removes a socket from a room or from all rooms if a room is not passed.

### adapter.broadcast(data, opts, clients)

Broadcasts a packet.

### adapter.clients(room, fn)

Get client ids connected to this room.

### adapter.empty(room, fn)

Remove all sockets from a room.

### adapter.isEmpty(room, fn)

Check to see if a room is empty.

### adapter.clear(fn)

Reset store.


## TODO

Add more tests.

## License

(The MIT License)

Copyright (c) 2013 Jonathan Brumley &lt;cayasso@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
