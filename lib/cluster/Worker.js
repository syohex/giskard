
'use strict';

var Logger = require('../util/Logger'),
	cluster = require('cluster');

/**
 * @constructor
 */
var Worker = function(context) {

	/*
     * Logger
     * @type {Logger}
     * @private
     */
    this._logger = new Logger(Logger.LEVEL.INFO, 'Worker');

    /**
     * COntext object for the worker
     * @type {Object}
     */
    this._context = context || {};

    /**
     * Inner worker instance
     * @type {cluster.Worker}
     * @private
     */
    this._instance = null;

    /**
     * Number of fails in the last control time
     * If we have more than the max number we cannot reload the worker, this avoids relaunch 
     * all the time the same bugged worker
     * @type {number}
     * "private"
     */
    this._fails = 0;

    /**
     * If true we have aborted the worker due to a high amount of fails so we
     * shouldn't try to launch it again
     * @type {boolean}
     * @private
     */
    this._aborted = false;

    /**
     * Timer for the fails clearing
     * @type {number}
     * @private
     */
    this._failsTimer = 0;

    /**
     * Id of the worker
     * @type {string}
     */
    this.id = '';

    // Invoke initialization mehtod
    this._init();
};

/**
 * Initialize the worker by forking it form the cluster with the given context
 * @private
 */
Worker.prototype._init = function() {
    
	this._instance = cluster.fork(this._context);
	this.id = this._instance.id;

	// Invoke the fails clear timeout
	this._clearFails();
};

/**
 * Clear the fails for this worker
 * @private
 */
Worker.prototype._clearFails = function() {

	if (this._aborted) {
		return;
	}

	this._fails = 0;

	// SInce we can invoke this method anytime we need to clear if any previous timer
	if (this._failsTimer) {
		clearTimeout(this._failsTimer);
	}

	// Invoke the fails clear timeout
	this._failsTimer = setTimeout(this._clearFails.bind(this), Worker.FAILS_TIMER);
};

/**
 * Register a fail in this worker
 * @param {Date} date Date of the fail
 * @param {number} code The exit code
 * @param {string} signal Name of the exit signal
 */
Worker.prototype.fail = function(date, code, signal) {

	this._fails++;

	this._logger.error('Something go wrong and a worker crashed! (' + 
		[code, signal, date.toString()].join(', ') + ')');
};

/**
 * Reload the curernt worker
 * @param {boolean=} force If true we force the realod no matter if we have fails or aborted flag
 */
Worker.prototype.reload = function(force) {
	
	if (this._aborted || this._fails > Worker.FAILS_MAX) {
		this._logger.error('Max number of fails reached, aborted');
		return;
	}

	// Disconnect the inner worker
	this._instance.disconnect();

	// Reinitialize the worker
	this._init();
};

/**
 * Attach an event listener to the intance
 * @param  {stirng} type
 * @param  {Function} handler
 */
Worker.prototype.on = function(type, handler) {
    this._instance.on(type, handler);
};

/**
 * Attach a one time event listener to the intance
 * @param  {string} type
 * @param  {Function} handler
 */
Worker.prototype.once = function(type, handler) {
    this._instance.once(type, handler);
};

/**
 * Disconnect the worker
 */
Worker.prototype.disconnect = function() {
    this._instance.disconnect();
};

/**
 * Kill the worker
 * @return {[type]} [description]
 */
Worker.prototype.kill = function() {
    this._instance.kill();
};

/**
 * Timer for the max number of fails in miliseconds (right now 1 minute)
 * @type {number}
 * @const
 */
Worker.FAILS_TIMER = 60000;

/**
 * Max number of fails before clearing (right now 10)
 * @type {number}
 * @const
 */
Worker.FAILS_MAX = 10;

// Export the module
module.exports = Worker;
