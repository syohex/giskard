'use strict';

// Imports
var Logger = require('./util/Logger'),
    ConfigLoader = require('./config/ConfigLoader'),
    Master = require('./cluster/Master');

/**
 * Main class for giskard
 * @constructor
 */
var Main = function() {

    /**
     * Logger
     * @type {Logger}
     * @private
     */
    this._logger = new Logger(Logger.LEVEL.INFO, 'Main');

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
Main.prototype._init = function() {

    process.title = Main.MAIN_PROCESS_TITLE;

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
Main.prototype._uncaughtError = function(err, msg, stack) {
    this._logger.error('Caught exception: ' + err.message, {color: 'red'});
    this._logger.error(err.stack);
};

/**
 * Return the context object
 * @return {Object}
 */
Main.prototype._getContext = function() {
    return {
        config: JSON.stringify(this._config)
    };
};

/**
 * Initialize the master
 * @private
 */
Main.prototype._initMaster = function(config) {

    this._config = config;

    //TODO: Add a proper context
    this._master = new Master(
        require.resolve(Main.DEFAULT_INSTANCE), 
        this._getContext(),
        config);

    this._master.start();
};

/**
 * Start giskard with the given config path
 * @param {string=} path
 */
Main.prototype.start = function(path) {
    this._configPath = path || '';
    this.reload();
};

/**
 * Reload config file
 */
Main.prototype.reload = function() {
    var loader = new ConfigLoader();
    loader.load(this._configPath, this._initMaster.bind(this));
}; 

/**
 * Stop all the workers
 */
Main.prototype.stop = function(force) {

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
Main.DEFAULT_CONFIG_PATH = process.cwd() + '/config.json';

/**
 * Default config file, used when no custom one is providedf
 * @type {string}
 * @const
 */
Main.DEFAULT_CONFIG_FILE = './resources/config.json';

/**
 * Instance of the server to be executed (WIP)
 * @type {string}
 * @const
 */
Main.DEFAULT_INSTANCE = './Instance';

/**
 * TItle for giskard main process
 * @type {string}
 * @const
 */
Main.MAIN_PROCESS_TITLE = 'Main - master';

// Export the class
module.exports = Main;
