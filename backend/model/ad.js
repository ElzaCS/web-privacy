var mongoose = require('mongoose');
var Schema = mongoose.Schema;

adSchema = new Schema( {
	year: Number,
	product_type: {
		name: String,
		id: String
	},
	title: String,
	notes: String,
}),
ad = mongoose.model('ad', adSchema);

module.exports = ad;