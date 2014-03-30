'use strict';

var http = require('http'),
    url = require('url'),
    path = require('path'),
    domains = require('domain'),
    mime = require('./util/mime'),
    Logger = require('./util/Logger'),
    FileResolver = require('./resolvers/FileResolver'),
    config = JSON.parse(process.env.config),
    instance;

/**
 * Each sinxelo intance used by the workers
 * @constructor
 */
var Instance = function(root, port, id) {

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
Instance.prototype._init = function() {
    process.title = Instance.WORKER_TITLE + ' ' + process.env.workerId;
};

Instance.prototype._resolverSuccess = function(res, file, stream) {
    this._logger.debug('File ' + file + ' found, 200!');
    res.statusCode = 200;
    res.end();
};

/**
 * Handles resolver error
 * @param  {http.Response} res
 * @param  {string} file
 */
Instance.prototype._onStreamEnd = function(res, file) {
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
Instance.prototype._resolverError = function(res, file, stream) {
    stream.pipe(res);
    stream.on('end', this._onStreamEnd.bind(this, res, file));
};

/**
 * Error handler for the domain of the instance
 * @param  {Domain} domain
 * @param  {Error} err
 */
Instance.prototype._onDomainError = function(domain, err) {
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
Instance.prototype._onRequest = function(req, res) {
    var domain = domains.create();

    domain.on('error', this._onDomainError.bind(this, domain));
    domain.enter();

    this._request(req, res);
};

/**
 * Handle the request for the web server
 * @param  {http.Request} req
 * @param  {http.Response} res
 */
Instance.prototype._request = function(req, res) {

    var urlData = url.parse(req.url, true),
        href = urlData.href,
        urlPath = urlData.path.split('/'),
        file = path.join(this._root + (href && href !== '/' ? href : '/index.html')),
        ext = path.extname(file).replace('.', ''),
        type = mime.type(ext),
        basePath = '',
        resolver;

    // App level session sample, just allow sinple serializable code
    // var i = process.env.session.number || 0;
    // process.env.session = {number: parseInt(i) + 1};
    // console.dir(process.env.session);

    //TODO: Remove this and do a proper implementation
    if (urlPath.length >= 2 && config.folders && config.folders[urlPath[1]]) {
        basePath = config.folders[urlPath[1]];
        urlPath = urlPath.slice(2);

        file = basePath + urlPath.join('/');
    }

    resolver = new FileResolver(file);

    this._logger.log('New request to ' + req.url);

    if (type) {
        res.setHeader('Content-Type', type);
    }

    resolver.on(FileResolver.SUCCESS_EVENT, this._resolverSuccess.bind(this, res));
    resolver.on(FileResolver.ERROR_EVENT, this._resolverError.bind(this, res));

    resolver.resolve().pipe(res);
};

/**
 * Start the web server
 */
Instance.prototype.start = function() {

    this._server.on('request', this._onRequest.bind(this));

    this._server.listen(this._port || 8080);

    this._logger.debug('Worker ' + this._id + ' started to listen to port ' + (this._port || 80));
    this._logger.debug('http://localhost:' + (this._port || 80) + '/', {style: 'underline', color: 'blue'});
};

/**
 * TItle for sinxelo main process
 * @type {string}
 * @const
 */
Instance.WORKER_TITLE = 'Sinxelo - worker';

// Initialize and start the instance
instance = new Instance(config.path, config.port);
instance.start();
