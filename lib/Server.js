'use strict';

var http = require('http'),
    url = require('url'),
    path = require('path'),
    domains = require('domain'),
    fs = require('fs'),
    mime = require('./util/mime'),
    Logger = require('./util/Logger'),
    GiskardTemplate = require('./Template.js'),
    // FileResolver = require('./resolvers/FileResolver'),
    config = process.env.config ? JSON.parse(process.env.config) : {},
    server;

/**
 * Each sinxelo intance used by the workers
 * @constructor
 */
var Server = function(root, port, id) {

    /**
     * Id of thew worker
     * @type {number}
     * @private
     */
    this._id = id;

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

    this._init();
};

/**
 * Initialization method for the instance
 * @private
 */
Server.prototype._init = function() {
    process.title = Server.WORKER_TITLE + ' ' + process.env.workerId;
};

Server.prototype._resolverSuccess = function(res, file) {
    this._logger.debug('File ' + file + ' found, 200!');
    res.statusCode = 200;
    res.end();
};

/**
 * Handles resolver error
 * @param  {http.Response} res
 * @param  {string} file
 */
Server.prototype._onStreamEnd = function(res, file) {
    this._logger.debug('File ' + file + ' not found, 404!');

    // TODO: Do a proper 404, maybe change it to 500 and do the check for the file first
    res.statusCode = 404;
    res.end();
};

/**
 * Handles the resolver error, right now just an 404
 * @param  {http.Response} res
 * @param  {string} file
 * @param  {stream.Writable]} stream
 */
Server.prototype._resolverError = function(domain, error) {

    if (error.errno === 34) {
        console.log('Error 404 on ' + error.path);
    } else {
        console.log(error);
    }
    // stream.pipe(res);
    // stream.on('end', this._onStreamEnd.bind(this, res, file));
};

/**
 * Error handler for the domain of the instance
 * @param  {Domain} domain
 * @param  {Error} err
 */
Server.prototype._onDomainError = function(domain, err) {
    this._logger.error('An uncaught error happened: ' + (err.message  || err.code + '@' + err.path));
    this._logger.error(err.stack);

    // TODO: Do a proper response for the browser, like 500
    // self.handleError(res, 500, err);
    // self.error(res, err);

    domain.dispose();
};

/**
 * Handles the requests to the web server
 * @param  {http.Request} req
 * @param  {http.Response} res
 */
Server.prototype._onRequest = function(req, res) {
    var domain = domains.create();

    domain.on('error', this._onDomainError.bind(this, domain));
    domain.enter();

    this._request(req, res);
};

/**
 * Read file
 */
Server.prototype._readFile = function(ext, req, res, err, data) {

    if (err) {
        console.log(err.code + '@' + err.path);

        res.statusCode = err.code === 'ENOENT' ? 404 : 500;
        res.end();
        return;
    }

    if (ext === 'html') {
        var template = new GiskardTemplate(this._root + '/', req, [], data, {pepito: 12, manolito: { pepito: 10 }});
        res.write(template.contents);
    } else {
        res.write(data);
    }

    res.statusCode = 200;
    res.end();
};

/**
 * Handle the request for the web server
 * @param  {http.Request} req
 * @param  {http.Response} res
 */
Server.prototype._request = function(req, res) {

    var urlData = url.parse(req.url, true),
        href = urlData.pathname,
        urlPath = urlData.pathname.split('/'),
        file = path.join(this._root + (href && href !== '/' ? href : '/index.html')),
        ext = path.extname(file).replace('.', ''),
        type = mime.type(ext),
        basePath = this._root + '/';

    //TODO: Remove this and do a proper implementation
    if (urlPath.length >= 2 && config.folders && config.folders[urlPath[1]]) {
        basePath = config.folders[urlPath[1]];
        urlPath = urlPath.slice(2);

        file = basePath + urlPath.join('/');
    }

    fs.readFile(file, this._readFile.bind(this, ext, req, res));

    if (type) {
        res.setHeader('Content-Type', type);
    }
};

/**
 * Start the web server
 */
Server.prototype.start = function() {

    this._server.on('request', this._onRequest.bind(this));

    this._server.listen(this._port || 8080);

    this._logger.debug('Worker ' + process.env.workerId + ' started to listen to port ' + (this._port || 80));
    this._logger.debug('http://localhost:' + (this._port || 80) + '/', {style: 'underline', color: 'blue'});
};

/**
 * TItle for sinxelo main process
 * @type {string}
 * @const
 */
Server.WORKER_TITLE = 'Giskard - worker';

// Initialize and start the instance
server = new Server(config.path, config.port);
server.start();

module.exports = Server;
