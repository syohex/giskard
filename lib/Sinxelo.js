'use strict';

// Imports
var cluster = require('cluster'),
    fs = require('fs'),
    Logger = require('./util/Logger'),
    ConfigLoader = require('./config/ConfigLoader'),
    Master = require('./cluster/Master');

/**
 * Main class for sinxelo
 * @constructor
 */
var Sinxelo = function() {

    /**
     * Logger
     * @type {Logger}
     * @private
     */
    this._logger = new Logger(Logger.LEVEL.INFO, 'Sinxelo');

    /**
     *
     * @type {string}
     */
    this._configPath = '';

    /**
     * Current configuration
     * @type {Object}
     */
    this._config = null;

    /**
     * Master for the cluster
     * @type {Master}
     * @private
     */
    this._master = null;

    // Initialize the class
    this._init();
};

/**
 * Initialize method
 * @private
 */
Sinxelo.prototype._init = function() {

    process.title = Sinxelo.MAIN_PROCESS_TITLE;

    // Handler for general exceptions that shouldnt happen...
    process.on('uncaughtException', this._uncaughtError.bind(this));
};

/**
 * Handles uncaught exceptions
 * @private
 * @param  {Error} err
 * @param  {string} msg
 * @param  {Object} stack
 */
Sinxelo.prototype._uncaughtError = function(err, msg, stack) {
    this._logger.error('Caught exception: ' + err.message, {color: 'red'});
    this._logger.error(err.stack);
};

/**
 * Return the context object
 * @return {Object}
 */
Sinxelo.prototype._getContext = function() {
    return {
        config: JSON.stringify(this._config)
    };
};

/**
 * Initialize the master
 * @private
 */
Sinxelo.prototype._initMaster = function(config) {

    this._config = config;

    //TODO: Add a proper context
    this._master = new Master(
        require.resolve(Sinxelo.DEFAULT_INSTANCE), 
        this._getContext(),
        config);

    this._master.start();
};

/**
 * Start sinxelo with the given config path
 * @param {string=} path
 */
Sinxelo.prototype.start = function(path) {
    this._configPath = path || '';
    this.reload();
};

/**
 * Reload config file
 */
Sinxelo.prototype.reload = function() {
    var loader = new ConfigLoader();
    loader.load(this._configPath, this._initMaster.bind(this));
}; 

/**
 * Stop all the workers
 */
Sinxelo.prototype.stop = function(force) {

    if (!this._master) {
        return;
    }

    if (force) {
        this._master.kill();
    } else {
        this._master.disconnect();
    }
};


/**
 * Default path to the config file
 * @type {string}
 * @conts
 */
Sinxelo.DEFAULT_CONFIG_PATH = process.cwd() + '/config.json';

/**
 * Default config file, used when no custom one is providedf
 * @type {string}
 * @const
 */
Sinxelo.DEFAULT_CONFIG_FILE = './resources/config.json';

/**
 * Instance of the server to be executed (WIP)
 * @type {string}
 * @const
 */
Sinxelo.DEFAULT_INSTANCE = './Instance';

/**
 * TItle for sinxelo main process
 * @type {string}
 * @const
 */
Sinxelo.MAIN_PROCESS_TITLE = 'Sinxelo - master';

// Export the class
module.exports = Sinxelo;
