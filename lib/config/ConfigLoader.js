
'use strict';

var Logger = require('../util/Logger'),
	fs = require('fs');

/**
 * @constructor
 */
var ConfigLoader = function() {

	/*
     * Logger
     * @type {Logger}
     * @private
     */
    this._logger = new Logger(Logger.LEVEL.INFO, 'Config');

    /**
     * Default configuration object
     * @type {Object}
     * @private
     */
    this._default = {};

    /**
     * COnfiguration object
     * @type {Object}
     * @private
     */
    this._config = {};
};

ConfigLoader.prototype._merge = function(current, original) {

	var result = {},
		key,
		value;

	for (key in original) {
		if (original.hasOwnProperty(key)) {

			if (current.hasOwnProperty(key)) {
				value = current[key];

				if (value.constructor === Object) {
					result[key] = this._merge(current[key], original[key]);
				} else {
					result[key] = current[key];
				}

			} else {
				result[key] = original[key];	
			}
		}
	}

	return result;
};

/**
 * Parse a config file after it loads or throws an error if there was any problem
 * reading the file
 * @param {Function} callback
 * @param {*} err
 * @param {*} data
 */
ConfigLoader.prototype._parseConfig = function(callback, err, data) {

	if (err) {
		this._config = this._default;
		this._logger.error('Cannot load custom config file (' + err.message + ')');
        return false;
	}

	var config = JSON.parse(data);

	this._config = this._merge(config, this._default);
	callback(this._config);
};

/**
 * Return the config
 * @return {Object}
 */
ConfigLoader.prototype.getConfig = function() {
	return this._config;
};

/**
 * Load the specified configuration file
 * @param {string} path
 * @param {Function} callback
 */
ConfigLoader.prototype.load = function(path, callback) {

	// Load default config file
	this._default = require(ConfigLoader.DEFAULT_CONFIG);

	if (path) {
    	fs.readFile(path, this._parseConfig.bind(this, callback));
    } else {
    	this._config = this._default;
    	callback(this._config);
    }
};

ConfigLoader.DEFAULT_CONFIG = './config.json';

module.exports = ConfigLoader;