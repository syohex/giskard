
var util = require('util');
var events = require('events');
var http = require('http');
var url = require('url');
var path = require('path');
var fs = require('fs');
var domains = require("domain");
var mime = require('./mime.js');

var server = {

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

	printVar: {
		enumerable: false,
		value: function(value) {

			var result = '';

			var values = {
				'pepito': 'ok',
				'manolito': 'nice'
			};

			result = values[value.trim()];

			//console.log('-' + value + '-');
			//console.log(values);

			return result;
		}
	},

	loadTemplates: {
		enumerable: false,
		value: function(content, context) {

			var that = this;

			var prints = /<\?\s*(print\s+(.*))\s*\?>/g;
			var imports = /<\?\s*(import\s+'(.*)')\s*\?>/g;

			/*while (match = prints.exec(content)) {
				console.log(match[2]);
			}*/

			result = content.replace(prints, function(match, p1, p2, index, string) {
				return that.printVar(p2);
			});


			var hasTemplates = false;
			while (match = imports.exec(content)) {
				var file = path.join(this.basePath,  match[2]);
				var str = match[0];
				hasTemplates = true;

				fs.exists(file, function(exists){

					if (exists) {

						fs.readFile(file, function (err, data) {


							if (err) {
								//context.handleError(res, 500, "Error reading file " + file);
								result = content.replace(str, '!!!Error reading template ' + file);
							} else {
								result = content.replace(str, data.toString("utf-8"));
							}
						});

					} else {
						result = content.replace(str, '');
					}
				});
			}

			console.log(result);

			if (hasTemplates) {
				return false;
			} else {
				return result;	
			}
			
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

					//context.emit('read', { file: file, type: type, data: data, response: res });

					

					if (type === 'text/html') {
						var content = data.toString("utf-8");
						data = context.loadTemplates(content, context);
					}
					


					if (type) {
						res.setHeader("Content-Type", type);
					}

					res.statusCode = 200;

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

			var file = path.join(this.basePath + (href && href !== '/' ? href : '/index.html'));

			

			fs.exists(file, function(exists){
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

			

			this.basePath = root;

			this.server.on('request', function onRequest(req, res){ 

				var domain = domains.create();
				
				domain.on('error', function(err) {
					self.handleError(res, 500, err.message);
					domain.dispose();
				});

				domain.enter();
				self.handleRequest(req, res, self) 
			});

			this.server.listen(port || 80);
		}
	}
};

module.exports = {

	instances: {},

	spawn: function(name) {

			this.instances[name] = Object.create(events.EventEmitter.prototype, server);

			return this.instances[name];

	}

};
