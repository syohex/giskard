'use strict';

// Imports
var cluster = require('cluster'),
    os = require('os'),
    fs = require('fs'),
    Logger = require('./util/Logger');

/**
 * Main class for sinxelo
 * @constructor
 */
var Sinxelo = function(config) {

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
    this._configPath = config || Sinxelo.DEFAULT_CONFIG_PATH;

    /**
     * Current configuration
     * @type {Object}
     */
    this._config = null;

    /**
     * Global app holder
     * @type {Object}
     */
    this._global = (function() {  var self = {}; self.toString = function() { return 'lol'; }; return self; }());

    /**
     * Number of workers to spawn.
     * The number of cpus by default
     * @type {number}
     */
    this._workers = new Array(os.cpus().length);

    /**
     * If true sinxleo is using the default config file
     * @type {boolean}
     * @private
     */
    this._defaultConfig = false;

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
 * @param  {Error} err
 * @param  {string} msg
 * @param  {Object} stack
 */
Sinxelo.prototype._uncaughtError = function(err, msg, stack) {
    this._logger.error('Caught exception: ' + err.message, {color: 'red'});
    this._logger.error(err.stack);
};

/**
 * Apply the configuration for the file or throw an exception if the file
 * is not found or has any errors
 * @param {Function} callback
 * @param {*} err
 * @param {*} data
 */
Sinxelo.prototype._applyConfig = function(callback, err, data) {

    // If we have any reading errors we create a new default config.json file, if not
    // we try to parse it as json
    if (err) {
        
        if (this._defaultConfig) {
            this._logger.error('Cannot load default config file, no custom or incorrect one supplied (' + err.message + ')');
            return false;    
        }

        // We try to load the default one
        this._defaultConfig  = true;
        fs.readFile(Sinxelo.DEFAULT_CONFIG_FILE, this._applyConfig.bind(this, callback));

    } else {

        this._defaultConfig  = false;

        try {
            this._config = JSON.parse(data);
        } catch (e) {
            this._logger.error('Cannot parse the config file (' + err.message + ')');
            return false;
        }
    }

    if (!this._config) {
        this._logger.error('The config file cannot be empty (' + err.message + ')');
        return false;
    }

    if (callback) {
        callback.call(this);
    }
};

/**
 * Load the config.json file and parse it
 * @private
 * @param {string} path Path to the file, '/config.json' by default
 * @param {function} callback Method to invoke when the file is fully readed
 */
Sinxelo.prototype._loadConfig = function (path, callback) {
    fs.readFile(path, this._applyConfig.bind(this, callback));
};

/**
 * Handler for the worker exit event
 * @param  {*} worker
 * @param  {*} code
 * @param  {*} signal
 */
Sinxelo.prototype._workerExit = function(worker, code, signal) {

    var newWorker;

    if (code !== 0 && worker.suicide !== true) {

        //TODO: Implemnent a counter so we dont respawn bugged workers for ever,
        //maybe exit if it fails 5 times in a row or at least apply a timeout?
        this._logger.error('Something go wrong and a worker crashed! (' + code + ', ' + signal + ')', {color: 'yellow'});

        newWorker = cluster.fork({config: JSON.stringify(this._config), session: this._global});
        this._updateWorkers();
    }
};

/**
 * Initialize the workers based on the current config
 */
Sinxelo.prototype._startWorkers = function() {

    var i = 0,
        debugArg = '',
        worker;

    //Configure cluster
    //TODO: Take a deep look at the config options
    cluster.setupMaster({exec : require.resolve(Sinxelo.DEFAULT_INSTANCE), args: [], silent : false});

    // Control unwanted exits
    cluster.on('exit', this._workerExit.bind(this));

    if (this._config.debug) {

        this._logger.debug('Debug enabled', {color: 'grey'});

        // We update the
        this._workers = new Array(this._config.debugPorts ? this._config.debugPorts.length : 1);
        debugArg = [this._config.debugBreak ? '--debug-brk' : '--debug'];
    }

    // Spawn workers based on the number os cpus of the machine with the config object
    for (i = 0; i < this._workers.length; i++) {

        if (this._config.debug) {
            cluster.settings.execArgv.push(debugArg + (this._config.debugPort ? '=' + this._config.debugPort[i] : ''));
        }

        worker = cluster.fork({config: JSON.stringify(this._config), session: this._global, workerId: i});
        this._workers[i] = {'key': worker.id, 'worker': worker};

        this._logger.debug('Worker ' + worker.id + ' initialized', {color: 'grey'});
    }
};

/**
 * Update the worker list, to be trigger after a failed or a change in the workers
 */
Sinxelo.prototype._updateWorkers = function() {

    this._workers = [];

    for (var key in cluster.workers) {
        if (cluster.workers.hasOwnProperty(key)) {
            this._workers.push({
                'key': key,
                'worker': cluster.workers[key]
            });
        }
    }
};

/**
 * Event handling for worker disconnect
 * @param  {Object} worker
 */
Sinxelo.prototype._workerReloadDisconnect = function(worker) {
    this._logger.debug(worker.id + ' worker shutdown due reload.');
};

/**
 * Event handling for worker disconnect
 * @param {Object} worker
 */
Sinxelo.prototype._workerReloadListening = function(i, worker) {
    this._logger.debug('Replacement worker ' + worker.id + ' online.');
    this._reloadWorker(i - 1);
};

/**
 * Reload workers one at a time so we dont find ourselves whithout workers
 * @param {number=} i
 */
Sinxelo.prototype._reloadWorkers = function(i) {

    var worker = this._workers[i];

    if (i === undefined) {
        i = this._workers.length;
    } else if (i <= 0) {
        this._logger.debug('All workers have been reloaded!');
        return false;
    }

    this._logger.debug('Killing ' + this._workers[i].key + ' worker');

    this._workers[i].worker.on('disconnect', this._workerReloadDisconnect.bind(this));
    this._workers[i].worker.disconnect();

    // Forking the replacement cluster and reloading next when this one is ready
    worker = cluster.fork({config: this._config});
    worker.on('listening', this._workerReloadListening.bind(this, i));
};

/**
 * Getter/Setter for the configuration path
 * @param {string} path
 * @return {string}
 */
Sinxelo.prototype.config = function(path) {
    if (path !== undefined) {
        this._configPath = path;
    }

    return this._configPath;
};

/**
 * Reload config file
 */
Sinxelo.prototype.reload = function() {

    // Load configuration file
    this._loadConfig(this._configPath, this._reloadWorkers);
};

/**
 *
 */
Sinxelo.prototype.start = function() {

    // Load configuration file
    this._loadConfig(this._configPath, this._startWorkers);
};

/**
 * Stop all the workers
 */
Sinxelo.prototype.stop = function(force) {

    for (var i = this._workers.length - 1; i >= 0; i--) {

        if (force) {
            this._workers[i].worker.disconnect();
        } else {
            this._workers[i].worker.kill();
        }
    }

    this._workers = [];
};

/**
 * Return a string representation of this instance
 * @return {[type]} [description]
 */
Sinxelo.prototype.toString = function() {
    return JSON.stringify(this.toJSON);
};

/**
 * Return a JSON object representing the current instance of the class
 * @return {Object}
 */
Sinxelo.prototype.toJSON = function() {
    return {
        'configPath': this._configPath,
        'config': this._config,
        'workers': this._workers,
        'global': this._global
    };
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
