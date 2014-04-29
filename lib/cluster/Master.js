
'use strict';

var Logger = require('../util/Logger'),
	cluster = require('cluster'),
	os = require('os'),
	Worker = require('./Worker');

/**
 * Master process manager for the cluster
 * @constructor
 * @param {string} script Path to the file the workers are going to execute
 * @param {Object} context Object to be shared among all the instances
 * @param {Object} config
 */
var Master = function(script, context, config) {

	/*
     * Logger
     * @type {Logger}
     * @private
     */
    this._logger = new Logger(Logger.LEVEL.INFO, 'Master');

    /**
     * Script to execute in the workers
     * @type {string}
     * @private
     */
    this._script = script;

    /**
     * Common context object wor the workers
     * @type {Object}
     * @private
     */
    this._context = context;

    /**
     * Configuration object
     * @type {Object}
     * @private
     */
    this._config = config;

    /**
	 * Maximin number of workers to spawn
	 * @type {number}
	 */
	this._workersLength = config.workers === 'auto' ? os.cpus().length : config.workers;

	/**
	 * List of workerss
	 * @type {Object}
	 */
	this._workers = {};

	/**
	 * Master process arguments
	 * @type {Array}
	 */
	this._args = [];

	/**
	 * List of workers pending to be reloaded
	 * @type {boolean}
	 * @private
	 */
	this._reloading = false;

	// Invoke initialization method
	this._init();
};

/**
 * Initialize the cluster
 * @private
 */
Master.prototype._init = function() {

	// Set the process title
	process.title = Master.PROCESS_TITLE;

	//Configure cluster
    cluster.setupMaster({
		exec : require.resolve(this._script),
		args: this._args,
		silent : false
	});

	// Control unwanted exits from the workers
	cluster.on('exit', this._onExit.bind(this));
};

/**
 * handles unwanted exists form the workers
 * @param {Worker} worker The worker itself
 * @param {number} code The exit code
 * @param {string} signal Name of the exit signal
 */
Master.prototype._onExit = function(worker, code, signal) {

	// Failed worker instance
	var failed;

	// We need to check if we have any code and if the exit is not a suicide
    if (code && !worker.suicide) {

    	failed = this._workers[worker.id];

    	// Register the fail in the worker and reload it
		failed.fail(Date.now, code, signal);
        failed.reload();
    }
};

/**
 * Add a worker to the master
 * @param {Worker} worker
 */
Master.prototype._add = function(worker) {
	this._workers[worker.id] = worker;
};

/**
 * Create all the workers and add them to the list
 */
Master.prototype._createWorkers = function() {
	for (var i = 0; i < this._workersLength; i++) {
		this._add(new Worker(this._context));
	}
};

/**
 * Create all the workers and add them to the list
 * @param {Array.<string>} ports List of ports to listen for debug, it determines the number of workers to spawn
 * @param {boolean=} stop If true the workers started in with a breakpoint to allow step by step debugging form the beginning
 */
Master.prototype._createDebugWorkers = function(ports, stop) {

	var arg = stop ? '--debug-brk' : '--debug',
		port;

	for (var i = 0; i < (ports.length || 1); i++) {

		port = ports[i];

		// Workaround to allow debugging with node inspector and cluster module as suggested in
		// https://github.com/joyent/node/issues/5318
        cluster.settings.execArgv.push(arg + (port ? '=' + port : ''));

		this._add(new Worker(this._context));
	}
};

/**
 * Reload the workers
 * @param  {Array} keys
 */
Master.prototype._reloadWorkers = function(keys) {

	var key = keys[0],
		next = keys.splice(1),
		worker = this._workers[key],
		replacement;

	if (!keys.length) {
		this._logger.debug('All workers reloaded.');
		return;
	}

    this._logger.debug('Killing ' + key + ' worker.');

  	// Disconnect worker
    worker.disconnect();
    
    replacement = new Worker(this._context);
    replacement.on('listening', this._reloadWorkers.bind(this, next));
    this._add(replacement);
};

/**
 * Set the instance for the workers
 * @param {string} path
 */
Master.prototype.setInstance = function(instance) {
	this._script = instance;
};

/**
 * Start all the workes in debug mode. This will
 * @param {Array.<string>} ports List of ports to listen for debug, it determines the number of workers to spawn
 * @param {boolean=} stop If true the workers started in with a breakpoint to allow step by step debugging form the beginning
 */
Master.prototype.debug = function(ports, stop) {
	
	this._createDebugWorkers(ports, stop);
};

/**
 * Start all the available workers
 */
Master.prototype.start = function() {

	// Create the workers, this will fork them and store them in the workers list
	this._createWorkers();
};

/**
 * Reload the workers
 */
Master.prototype.reload = function() {
	this._reloading = true;
	this._reloadWorkers(Object.keys(this._workers));
};

/**
 * Disconnect all the workers
 */
Master.prototype.disconnect = function() {

	var key;

	for (key in this._workers) {
		if (this._workers.hasOwnProperty(key)) {
			this._workers[key].disconnect();
		}
	}

	this._workers = {};
};

/**
 * Kill all the workers
 */
Master.prototype.kill = function() {
	var key;

	for (key in this._workers) {
		if (this._workers.hasOwnProperty(key)) {
			this._workers[key].kill();
		}
	}

	this._workers = {};
};

/**
 * Title for the Sinxelo process
 * @type {string}
 * @const
 */
Master.PROCESS_TITLE = 'Sinxelo::Master';

// Export the class
module.exports = Master;
