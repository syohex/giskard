
var util = require('util');
var sinxelo = require("./sinxelo");

process.on('uncaughtException', function (err, msg, stack) {
	console.log('Caught exception: ' + err);
	console.log(err.stack);
});


sinxelo.start('view');

/*
var server = http.createServer();

server.on('request', function (req, res) {

	var urlData = url.parse(req.url, true);

	var href = urlData.href;
	var query = urlData.query;

	//http basic auth
	/*
	var header=req.headers['authorization']||'',        // get the header
	token=header.split(/\s+/).pop()||'',            // and the encoded auth token
	auth=new Buffer(token, 'base64').toString(),    // convert from base64
	parts=auth.split(/:/),                          // split on colon
	username=parts[0],
	password=parts[1];
	*/
	/*
	var data = req.data;

	var file = path.join('view' + (href && href !== '/' ? href : '/index.html'));

	path.exists(file, function(exists){

		console.log(file + ' - ' + exists);

		if (!exists) {

			fileError(res, null, href);
			res.end();

		} else {

			fs.readFile(file, function (err, data) {

				if (err) {
					fileError(res, err, href);
				} else {
*/
					/*
					var type = 'text/html';

					var ext = path.extname(file).replace('.', '');

					if (ext) {
						var type = 'text/' + ext;
					}

					res.writeHead(200, {'Content-Type': type});
					*/
/*
					res.writeHead(200);
					res.write(data);
				}

				res.end();
			});
		}
	});
});

server.listen(80);
*/
//end
