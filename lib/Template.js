
var Handlebars = require('handlebars'),
	fs = require('fs');


//TODO: Make a proper implemnentation with a standarized response, header checks, etc
// that can be reused for other modifiers

/**
 * Template class for handlebars giskard tamplates
 * @contstructor
 * @param {string} base Base path for the tamplate
 * @param {http.Request} req Request object
 * @param {Array} headers Array of headers
 * @param {String|Buffer} contents Contents of the template
 * @param {Object=} context Optional context object
 */
var Template = function(base, req, headers, contents, context) {

	/**
	 * Base path for the templates
	 * @type {string}
	 */
	this.base = base;

	/**
	 * Http request object
	 * @type {htt.Request}
	 */
	this.request = req;

	/**
	 * List of headers
	 * @type {Array}
	 */
	this.headers = headers;

	/**
	 * Contents of the template
	 * @type {string}
	 */
	this.contents = contents;

	/**
	 * COntext object
	 * @type {Object}
	 */
	this.context = context;

	// Render the template
	this._render();
};

/**
 * Helper method for hanldebars to include another file as a template inside the current one
 * @private
 * @param  {string} path Base path for the templates
 * @param  {Object} context Object with the data to use in the template, if arguments is 2 then this are the options
 * @param  {Object} options Original options object for handlebars
 * @return {String} Resulting template
 */
Template.prototype._include = function(path, context, options) {

	if (arguments.length <= 2) {
		options = context;
		context = null;
	}

	var include = fs.readFileSync(this.base + path);
	return (Handlebars.compile(include.toString()))(context || this.context);
};

/**
 * Render the template
 * @private
 */
Template.prototype._render = function() {

	Handlebars.registerHelper('include', this._include.bind(this));

	var template = Handlebars.compile(this.contents.toString('utf-8')),
		result = template(this.context);

	//TODO: Update the header with the file size, etc

	this.contents = result;
};


// Export the module
module.exports = Template;
