'use strict';

var http = require('http'),
    url = require('url'),
    path = require('path'),
    domains = require('domain'),
    fs = require('fs'),
    mime = require('./util/mime'),
    Logger = require('./util/Logger'),
    // GiskardTemplate = require('./Template.js'),
    File = require('./File.js'),
    Response = require('./Response.js'),
    config = process.env.config ? JSON.parse(process.env.config) : {},
    server;

/**
 * Each sinxelo intance used by the workers
 * @constructor
 * @param {string} root
 * @param {number} port
 * @param {string} host
 */
var Server = function(root, port, host) {

    /**
     * Logger for the class
     * @type {Logger}
     * @private
     */
    this._logger = new Logger(Logger.LEVEL.INFO);

    /**
     * Webs erver for the instance
     * @type {http.Server}
     * @private
     */
    this._server = http.createServer();

    /**
     * Folder for the content
     * @type {string}
     * @private
     */
    this._root = root || '/';

    /**
     * Port for the web server
     * @type {number}
     * @private
     */
    this._port = port || 8080;

    /**
     * Host of the server, if none is specified all will be valid
     * @type {string}
     * @private
     */
    this._host = host || null;

    // Initialize the server
    this._init();
};

/**
 * Initialization method for the instance
 * @private
 */
Server.prototype._init = function() {
    process.title = Server.WORKER_TITLE + ' ' + process.env.workerId;
};

// Server.prototype._resolverSuccess = function(res, file) {
//     this._logger.debug('File ' + file + ' found, 200!');
//     res.statusCode = 200;
//     res.end();
// };

// /**
//  * Handles resolver error
//  * @param  {http.Response} res
//  * @param  {string} file
//  */
// Server.prototype._onStreamEnd = function(res, file) {
//     this._logger.debug('File ' + file + ' not found, 404!');
//
//     // TODO: Do a proper 404, maybe change it to 500 and do the check for the file first
//     res.statusCode = 404;
//     res.end();
// };

// /**
//  * Handles the resolver error, right now just an 404
//  * @param  {http.Response} res
//  * @param  {string} file
//  * @param  {stream.Writable]} stream
//  */
// Server.prototype._resolverError = function(domain, error) {
//
//     if (error.errno === 34) {
//         console.log('Error 404 on ' + error.path);
//     } else {
//         console.log(error);
//     }
//     // stream.pipe(res);
//     // stream.on('end', this._onStreamEnd.bind(this, res, file));
// };

/**
 *
 * @param {http.Request} req
 * @param {http.Response} res
 */
Server.prototype._readErrorTemplate = function(code, req, res, err, data) {

    if (err) {
        res.write('Uncaught error happened 500');
        res.statusCode = 500;

    } else {
        res.write(data);
        res.statusCode = code;
    }

    res.end();
};

/**
 *
 * @param {http.Request} req
 * @param {http.Response} res
 */
Server.prototype._responseError = function(code, req, res) {

    var file = require.resolve('./resources/' + code + '.html');
    fs.readFile(file, this._responseError.bind(this, code, req, res));
};

/**
 * Error handler for the domain of the instance
 * @param  {Domain} domain
 * @param  {Error} err
 */
Server.prototype._onDomainError = function(req, res, domain, err) {

    // Log the error using the logger
    this._logger.error('An uncaught error happened: ' + (err.message  || err.code + '@' + err.path));
    this._logger.error(err.stack);

    // Write de 500 error
    this._responseError(500, req, res);

    // Do a cleanup and destroy the domain
    domain.dispose();
};

/**
 * Apply the modifiers to the response
 * @private
 * @param {http.Request} req
 * @param {Response} res
 */
Server.prototype._applyModifiers = function(req, res) {

    var modifier,
        i,
        Module;

    for (i = 0; i < config.modifiers.length; i++) {
        modifier = config.modifiers[i];

        if (modifier.extensions.indexOf(res.file.extension) < 0) {
            continue;
        }

        Module = require(path.resolve(this._root + '/../node_modules/' + modifier.name));
        res = (new Module(res, res)).modify();
    }

    return res;
};

/**
 * Read file
 */
Server.prototype._readFile = function(file, req, res, err, data) {

    var response = null;

    if (err) {
        console.log(err.code + '@' + err.path);

        res.statusCode = err.code === 'ENOENT' ? 404 : 500;
        res.end();
        return;

    }

    if (file.mime) {
        res.setHeader('Content-Type', file.mime);
    }

    response = new Response(
        res,
        this._root + '/' + Server.STATICS_PATH + '/',
        file,
        [],
        data
    );

    response = this._applyModifiers(req, response);

    //TODO: Add headers to the reponse
    res.write(response.body);
    res.statusCode = 200;
    res.end();
};

/**
 * [_handleRequest description]
 * @param {[type]} req [description]
 * @param {[type]} res [description]
 */
Server.prototype._getFileForUrl = function(reqUrl) {

    var data = url.parse(reqUrl, true),
        urlPath = data.pathname,
        components = urlPath.split('/'),
        pathArray = components.slice(0, components.length -1),
        name = components[components.length - 1],
        query = data.query,
        file,
        ext,
        type,
        result;


    if (!name) {
        name = 'index.html';
        ext = 'html';
    }

    ext = path.extname(name).replace('.', '');

    if (!ext) {
        ext = 'html'; // Default extension
        name = name + '.' + ext;
    }

    type = mime.type(ext);

    //TODO: Remove this and do a proper implementation
    if (urlPath.length >= 2 && config.folders && config.folders[urlPath[1]]) {
        file = config.folders[urlPath[1]] + '/';
    } else {
        file = this._root + '/' + Server.STATICS_PATH;
    }

    if (pathArray.length) {
        file += '/' + path.join.apply(path, pathArray);
    }

    file += '/' + name;
    file = path.resolve(file);

    result = new File('/' + pathArray.join('/'), name, ext, type, query, file);

    return result;
};

/**
 * Handle the request for the web server
 * @param  {http.Request} req
 * @param  {http.Response} res
 */
Server.prototype._handleRequest = function(req, res) {

    var file = this._getFileForUrl(req.url);

    fs.readFile(file.absolute, this._readFile.bind(this, file, req, res));
};

/**
 * Handles the requests to the web server
 * @param  {http.Request} req
 * @param  {http.Response} res
 */
Server.prototype._onRequest = function(req, res) {

    var domain = domains.create();

    domain.on('error', this._onDomainError.bind(this, req, res, domain));
    domain.enter();

    this._handleRequest(req, res);
};

/**
 * Start the web server
 */
Server.prototype.start = function() {

    this._server.on('request', this._onRequest.bind(this));
    this._server.listen(this._port || 8080, this._host);

    this._logger.debug('http://' + (this._host || 'localhost') + ':' + (this._port || 80) + '/', {style: 'underline'});
};

/**
 * TItle for sinxelo main process
 * @type {string}
 * @const
 */
Server.WORKER_TITLE = 'Giskard - worker';

/**
 * Path for statis files
 * @type {string}
 * @const
 */
Server.STATICS_PATH = 'static';

// Initialize and start the instance
server = new Server(config.path, config.port, config.host);
server.start();

module.exports = Server;
