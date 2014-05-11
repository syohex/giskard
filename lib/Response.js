
/**
 * Request object used to wrap the http requests for the server and provided
 * additional information
 * @constructor
 * @param {http.Response} res Original http response object for the server
 * @param {string} root Path to the root of the app
 * @param {File} file File object with the file metadata like extension, folder, etc
 */
var Request = function(res, root, file, headers, body) {

	/**
	 * Resposne object
	 * @type {http.Response}
	 */
	this.res = res;

	/**
	 * Root path
	 * @type {string}
	 */
	this.root = root;

	/**
	 * File object
	 * @type {File}
	 */
	this.file = file;

	/**
	 * List of headers
	 * @type {Array}
	 */
	this.headers = headers || [];

	/**
	 * Body of the response
	 * @type {string}
	 */
	this.body = body || '';
};

// Exports the class
module.exports = Request;
