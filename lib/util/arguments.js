
/**
 * Onject used to parse console arguments
 */
var Arguments = {

	/**
	 * Parses the console arguments into an object
	 * @return {Object.<stringm, string>}
	 */
	parse: function() {
		var arguments = process.argv,
			argument,
			key,
			value,
			args = {};

		// The two first are the node exec and the sinxelo file, we need to parse the rest
		for (var i = 2; i < arguments.length; i++) {
			argument = arguments[i].trim();
			next = (i + 1) < arguments.length ? arguments[i + 1].trim() : null;

			key = argument.substring(1);

			if (argument.indexOf('-') === 0 && next && next.indexOf('-') !== 0) {
				i++; // Next argv if the value
				args[key] = arguments[i];
			} else {
				args[key] = true;
			}
		}

		return args;
	}
};

module.exports = Arguments.parse();
