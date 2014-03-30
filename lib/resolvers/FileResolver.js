
'use strict';

var fs = require('fs'),
    util = require('util'),
    Resolver = require('./Resolver');

/**
 * Class to resolve file paths
 * @constructor
 * @extends {events.EventEmitter}
 * @param {string} file
 */
var FileResolver = function (file) {

    /**
     * @type {string}
     */
    this.file = file;
    
    /**
     * @type {stream.Readable}
     */
    this.stream = null;
};
util.inherits(FileResolver, Resolver);

/**
 * Handles errors
 * @private
 * @param {string} 
 */
FileResolver.prototype._notfound = function (file) {
    this._pipe(FileResolver.ERROR_404_FILE, true);
    this._ko(this.file, this.stream);
};

/**
 * Pipe the file into the end stream
 * @private
 * @param {string} file
 * @return {stream.Writable}
 */
FileResolver.prototype._pipe = function (file, error) {
    
    var self = this;

    this.stream = fs.createReadStream(file);
    
    // Trigger events on end
    this.stream.on('end', function () {
        if (!error) {
            self._ok(file, self.stream);
        }
    });
    
    // If we are not in an error we check for one in the stream
    this.stream.on('error', function () {
        
        // Close the stream
        self.stream.unpipe();
        self.stream = null;
        
        if (!error) {
            self._notfound();
        } else {
            console.log(arguments);
        }
    });
    
    return this.stream;
};

/**
 *
 */
FileResolver.prototype._ok = function (file, stream) {
    this.emit(FileResolver.SUCCESS_EVENT, file, stream);
};

/**
 *
 */
FileResolver.prototype._ko = function (file, stream) {
    this.emit(FileResolver.ERROR_EVENT, file, stream);
};

/**
 * Check if the specified file exists and qrite it to end stream if ok 
 * or err stream if it doesnt
 * @param {string} file
 */
FileResolver.prototype.resolve = function () {
    return this._pipe(this.file);
};

//TODO: Move erro file paths to a global sinxelo var

/**
 * @const
 * @type {string}
 */
FileResolver.ERROR_404_FILE = require.resolve('../resources/404.html');
    
/**
 * Success event
 * @const
 * @type {string}
 */
FileResolver.SUCCESS_EVENT = 'success';

/**
 * Error event
 * @const
 * @type {string}
 */
FileResolver.ERROR_EVENT = 'error';

// Exports the class
module.exports = FileResolver;
