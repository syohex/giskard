
var events = require('events');
var http = require('http');
var url = require('url');
var path = require('path');
var fs = require('fs');


function fileError(res, err, href) {

	res.writeHead(404);
	var msg =  href ? '404 File ' + href + ' not found!' : JSON.stringify(err);
	res.write(msg);
}


module.exports = Object.create(events.EventEmitter, {

	server: {
		value: http.createServer()
	},

	handleRequest: {
		enumerable: false,
		value: function(req, res) {

			var urlData = url.parse(req.url, true);

			res.writeHead(200);
			res.write('Ok');
			res.end();
		}
	},

	start: {
		value: function() {

			this.server.on('request', this.handleRequest);

			this.server.listen(80);
		}
	}
});

//--
