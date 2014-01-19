/*jslint node:true, devel: true, plusplus: true, vars: true */
/*global config */

'use strict';

var util = require('util');
var events = require('events');
var http = require('http');
var url = require('url');
var path = require('path');
var fs = require('fs');
var domains = require("domain");
var mime = require('./mime');
var FileResolver = require('./FileResolver');

var server = {

	server: {
		value: http.createServer()
	},

	root: {
		value: ''
	},

    error: {
        value: function (err) {
            
        }
    },
    
	request: {
		enumerable: false,
		value: function (req, res, context) {
            
            var self = this;
            var urlData = url.parse(req.url, true);
            var href = urlData.href;
            var query = urlData.query;
            var file = path.join(this.basePath + (href && href !== '/' ? href : '/index.html'));
            var ext = path.extname(file).replace('.', '');
            var type = mime.type(ext);
            var resolver = new FileResolver(file);
            
            console.log("New request to " + req.url);
            
            if (type) {
                res.setHeader("Content-Type", type);
            }
    
            resolver.on(FileResolver.SUCCESS_EVENT, function (file, stream) {
                console.log("File " + file + " found, 200!");
                res.statusCode = 200;
                res.end();
            });
            
            resolver.on(FileResolver.ERROR_EVENT, function (file, stream) {
                stream.pipe(res);
                stream.on("end", function () {
                    console.log("File " + file + " not found, 404!");
                    res.statusCode = 404;
                    res.end();
                });
            });
            
            var stream = resolver.resolve();
            stream.pipe(res);
		}
	},

	start: {
		value: function (root, port) {

			var self = this;
            
			this.basePath = root;

			this.server.on('request', function onRequest(req, res) {

				var domain = domains.create();
				
				domain.on('error', function (err) {
                    console.log("An uncaught error happened: " + (err.message  || err.code + "@" + err.path));
					//self.handleError(res, 500, err);
                    // self.error(res, err);
					domain.dispose();
				});

				domain.enter();
				self.request(req, res, self);
			});

			this.server.listen(port || 80);
            
            console.log("Started to listen to port " + (port || 80));
		}
	}
};

// Create the instance
var instance = Object.create(events.EventEmitter.prototype, server);

// Get the config object
var config = JSON.parse(process.env.config);

// Initialize the instance
instance.start(config.path, config.port);
