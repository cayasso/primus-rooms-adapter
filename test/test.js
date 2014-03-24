'use strict';

var Adapter = require('../')
  , expect = require('expect.js')

describe('primus-rooms-adapter', function () {

  it('should have required methods', function () {
    var adapter = new Adapter();
    expect(adapter.set).to.be.a('function');
    expect(adapter.get).to.be.a('function');
    expect(adapter.del).to.be.a('function');        
    expect(adapter.broadcast).to.be.a('function');
    expect(adapter.clients).to.be.a('function');
    expect(adapter.empty).to.be.a('function');
    expect(adapter.isEmpty).to.be.a('function');
    expect(adapter.clear).to.be.a('function');
  });

});