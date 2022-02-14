var mongoose = require('mongoose');
var Schema = mongoose.Schema;

adSchema = new Schema( {
	year: Number,
	product_type: String,
	title: String,
	notes: String,
	id: Number
}),
ad = mongoose.model('ad', adSchema);

module.exports = ad;