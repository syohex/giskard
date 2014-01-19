
/*jslint node:true, devel: true, plusplus: true, vars: true */

'use strict';

// Imports
var util = require('util'),
    cluster = require('cluster'),
    os = require('os'),
    fs = require('fs');

// General exception handling
process.on('uncaughtException', function (err, msg, stack) {
	console.log('Caught exception: ' + err);
	console.log(err.stack);
});

// Default values
var DEFAULT_CONFIG = '/config.json';
var DEFAULT_INSTANCE = './instance';

var session = {};

/**
 * Main interface for the sinxelo server
 */
var main = {

    /**
     * Load the config.json file and parse it
     * @method
     * @private
     * @param {String} path Path to the file, '/config.json' by default
     * @param {Function} callback Method to invoke when the file is fully readed
     */
    loadConfig: function (path, callback) {
        
        fs.readFile(path || DEFAULT_CONFIG, function (err, data) {
            
            var config;
            
            //TODO: Try to get a better global error handling
            // Posible file errors
            if (err) {
                throw err;
            }
            
            // Posible json errors
            try {
                config = JSON.parse(data);
            } catch (e) {
                throw e;
            }
            
            callback.call(main, config);
        });
    },
    
    /**
     * Initialize the cluster by doing the setup and spawning the workers
     * @method
     * @private
     * @param {Object} config Configuraciton object for the server
     */
    initCluster: function (config) {
        
        var i, numberOfWorkers = os.cpus(), debugArg = "";
        
        //Configure cluster
        //TODO: Take a deep look at the config options
        cluster.setupMaster({exec : require.resolve(DEFAULT_INSTANCE), args: [], silent : false});
        
        // Control unwanted exits
        cluster.on("exit", function (worker, code, signal) {
            if (code !== 0 && worker.suicide !== true) {
                console.warn("Something go wrong and a worker crashed! (" + code + ", " + signal + ")");
                cluster.fork({config: JSON.stringify(config), session: session});
            }
        });
        
        if (config.debug) {
            console.log("Debug enabled");
            numberOfWorkers = config.debugPorts ? config.debugPorts.length : 1;
            debugArg = [config.debugBreak ? "--debug-brk" : "--debug"];
        }
        
        // Spawn workers based on the number os cpus of the machine with the config object
        for (i = 0; i < numberOfWorkers; i++) {
            
            if (config.debug) {
                cluster.settings.execArgv.push(debugArg + (config.debugPort ? "=" + config.debugPort[i] : ""));
            }
            console.log("Initializing worker " + i);
            cluster.fork({config: JSON.stringify(config), session: session});
        }
    },
    
    /**
     * Reload a worker based on the provided index with the config object
     * @method
     * @private
     * @param {Array} workers List of the workers we want to reload
     * @param {Number} i Index for the worker we need to reload
     * @parem {Object} config Configuration object for the server
     */
    reloadWorker: function (workers, i, config) {
        
        var worker;
            
        if (i <= 0) {
            console.log('All workers have been reloaded!');
            return false;
        }

        console.log('Killing ' + workers[i] + ' worker');

        cluster.workers[workers[i]].on("disconnect", function (worker) {
            console.log(worker.id + " worker shutdown ok.");
        });
        
        cluster.workers[workers[i]].disconnect();
        
        worker = cluster.fork({config: config});
        worker.on("listening", function () {
            console.log('Replacement worker ' + worker.id + ' online.');
            
            i--;
            main.reloadWorker(i, config);
        });
    },
    
    /**
     * Reload all the current workers by invoking reloadWorker method
     * @method
     * @private
     * @param {Object} config
     */
    reloadWorkers: function (config) {
        
        var workers = Object.keys(cluster.workers),
            i = workers.length;
        
        main.reloadWorker(workers, i, config);
    },
    
    /**
     * Initialize the server by loading the config and initializing the cluster
     * @method
     * @public
     * @param {String} path Path to the configuration file, '/config.json' by default
     */
    init: function (path) {
        main.loadConfig(path, main.initCluster);
    },
    
    /**
     * Stops all the current workers
     * @method
     * @public
     * @param {Boolean} force Force to use kill to terminate the process instead of disconnect
     */
    stop: function (force) {
        var workers = Object.keys(cluster.workers),
            i = 0;
            
        for (i = workers.length - 1; i >= 0; i--) {
            
            if (force) {
                workers[i].disconnect();
            } else {
                workers[i].kill();
            }
        }
    },
    
    /**
     * Reload all the current workers by reloading the config file and calling reloadWorkers
     * @method
     * @public
     * @param {String} path Path to the config file, '/config.json' by default
     */
    reload: function (path) {
        main.loadConfig(path, main.reloadWorkers);
    }
};

/**
 * Public interface for the server
 */
module.exports = {
    start: main.init,
    stop: main.stop,
    reload: main.reload
};