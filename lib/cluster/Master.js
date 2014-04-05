
'use strict';

var Logger = require('./util/Logger'),
	cluster = require('cluster'),
	os = require('os'),
	Worker = require('./Worker');

/**
 * Master process manager for the cluster
 * @constructor
 * @param {string} script
 */
var Master = function(script) {

	/**
     * Logger
     * @type {Logger}
     * @private
     */
    this._logger = new Logger(Logger.LEVEL.INFO, 'Sinxelo');

    /**
     * Script to execute in the workers
     * @type {string}
     * @private
     */
    this._instance = script;

    /**
	 * NUmbers of workers for this cluster
	 * @type {number}
	 * @private
	 */
	this._workersLength = os.cpus().length;

	/**
	 * List of workerss
	 * @type {Array.<Worker>}
	 */
	this._workers = [];
};

/**
 * Initialize the cluster
 * @private
 */
Master.prototype._init = function() {

	//Configure cluster
    cluster.setupMaster({
		exec : require.resolve(this._instance), 
		args: [], 
		silent : false
	});

	// Control unwanted exits
	cluster.on('exit', this._onExit.bind(this));
};

/**
 * handles unwanted exists form the workers
 * @param {Event} e
 */
Master.prototype._onExit = function(worker, code, signal) {

	var worker;

    if (code && !worker.suicide) {

    	

		this._workers[worker.id].registerFail(Date.now, code, signal);



        this._logger.error('Something go wrong and a worker crashed! (' + code + ', ' + signal + ')', {color: 'yellow'});

        newWorker = cluster.fork({config: JSON.stringify(this._config), session: this._global});
        this._updateWorkers();
    }
};

/**
 * Add a worker to the master
 * @param {Worker} worker
 */
Master.prototype.add = function(worker) {
	this._workers.push(worker);
};

/**
 * Create all the needed dworkers
 */
Master.prototype.createWorkers = function() {

};

module.exports = Master;