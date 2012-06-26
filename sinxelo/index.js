
var util = require('util');
var events = require('events');
var http = require('http');
var url = require('url');
var path = require('path');
var fs = require('fs');
var mime = require('./mime.js');

module.exports = Object.create(events.EventEmitter.prototype, {

	server: {
		value: http.createServer()
	},

	root: {
		value: ''
	},

	handleError: {
		enumerable: false,
		value: function(res, code, msg) {

			res.writeHead(code);
			res.write(msg);
			res.end();
		}
	},

	showFileContent: {
		enumerable: false,
		value: function(res, file, context) {

			var self = this;

			fs.readFile(file, function (err, data) {

				if (err) {
					context.handleError(res, 500, "Error reading file " + file);
				} else {


					var ext = path.extname(file).replace('.', '');
					var type = mime.type(ext);

					res.statusCode = 200;

					if (type) {
						res.setHeader("Content-Type", type);
					}

					res.write(data);
					res.end();
				}
			});


		}
	},

	handleRequest: {
		enumerable: false,
		value: function(req, res, context) {

			var that = context;

			var urlData = url.parse(req.url, true);

			var href = urlData.href;
			var query = urlData.query;

			var file = path.join('view' + (href && href !== '/' ? href : '/index.html'));

			path.exists(file, function(exists){
				if (!exists) {

					if (server.listeners.length > 0) {
						that.emit('notfound', { file: file, request: req, response: res });
					} else {
						that.handleError(res, 404, 'File not found!', context);
					}


				} else {

					that.emit('beforeread', { file: file, request: req, response: res });

					that.showFileContent(res, file, context);
				}
			});
		}
	},

	start: {
		value: function(root, port) {

			var self = this;

			this.root = root;

			this.server.on('request', function onRequest(req, res){ self.handleRequest(req, res, self) });

			this.server.listen(port || 80);
		}
	}
});
