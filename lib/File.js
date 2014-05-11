
/**
 * Object the holds the file metadata for the file in a server request
 * @constructor
 * @param {string} path
 * @param {string} name
 * @param {string} extension
 */
var File = function(path, name, extension, mime, query, absolute) {

	/**
	 * Path to the file
	 * @type {string}
	 */
	this.path = path;

	/**
	 * Name of the file
	 * @type {string}
	 */
	this.name = name;

	/**
	 * Extension of the file
	 * @type {string}
	 */
	this.extension = extension;

	/**
	 * Mime type of the file
	 * @type {string}
	 */
	this.mime = mime;

	/**
	 * QUery object
	 * @type {Object}
	 */
	this.query = query;

	/**
	 * ABsolute path to the file
	 * @type {string}
	 */
	this.absolute = absolute;
};

// Exports the file object
module.exports = File;
