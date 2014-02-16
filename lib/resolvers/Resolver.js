
'use strict';

var events = require('events'),
	util = require('util');

var Resolver = function() {

};
util.inherits(Resolver, events.EventEmitter);

module.exports = Resolver;
