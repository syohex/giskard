
'use strict';

var events = require('events'),
	util = require('util');

/**
 * Abstract generic request resolver
 * @constructor
 * @extends {events.EventEmitter}
 */
var Resolver = function() {
	
};
util.inherits(Resolver, events.EventEmitter);

module.exports = Resolver;
