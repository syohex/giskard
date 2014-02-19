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
 * @constructor
 */
var Instance = function(root, port) {

    /**
     *
     * @type {Logger}
     */
    this._logger = new Logger(Logger.LEVEL.INFO);

    /**
     *
     * @type {*}
     */
    this._server = http.createServer();

    /**
     *
     * @type {*}
     */
    this._root = root || '/';

    this._port = port || 8080;
};

Instance.prototype._resolverSuccess = function(res, file, stream) {
    this._logger.debug('File ' + file + ' found, 200!');
    res.statusCode = 200;
    res.end();
};

Instance.prototype._onStreamEnd = function(res, file) {
    this._logger.debug('File ' + file + ' not found, 404!');
    res.statusCode = 404;
    res.end();
};

Instance.prototype._resolverError = function(res, file, stream) {
    stream.pipe(res);
    stream.on('end', this._onStreamEnd.bind(this, res, file));
};

Instance.prototype._onDomainError = function(domain, err) {
    this._logger.error('An uncaught error happened: ' + (err.message  || err.code + '@' + err.path));
    this._logger.error(err.stack);
    //self.handleError(res, 500, err);
    // self.error(res, err);
    domain.dispose();
};

Instance.prototype._onRequest = function(req, res) {
    var domain = domains.create();

    domain.on('error', this._onDomainError.bind(this, domain));
    domain.enter();

    this.request(req, res);
};

Instance.prototype.request = function(req, res) {

    var urlData = url.parse(req.url, true);
    var href = urlData.href;
    var urlPath = urlData.path.split('/');
    var file = path.join(this._root + (href && href !== '/' ? href : '/index.html'));
    var ext = path.extname(file).replace('.', '');
    var type = mime.type(ext);
    var resolver = new FileResolver(file);

    if (urlPath.length > 2 && config.folder) {
        //TODO: Implement virtaul folder logic
    }

    this._logger.log('New request to ' + req.url);

    if (type) {
        res.setHeader('Content-Type', type);
    }

    resolver.on(FileResolver.SUCCESS_EVENT, this._resolverSuccess.bind(this, res));
    resolver.on(FileResolver.ERROR_EVENT, this._resolverError.bind(this, res));

    resolver.resolve().pipe(res);
};

Instance.prototype.start = function() {

    this._server.on('request', this._onRequest.bind(this));

    this._server.listen(this._port || 8080);

    this._logger.debug('Started to listen to port ' + (this._port || 80));
    this._logger.debug('http://localhost:' + (this._port || 80) + '/', {style: 'underline', color: 'blue'});
};

// Initialize and start the instance
instance = new Instance(config.path, config.port);
instance.start();
