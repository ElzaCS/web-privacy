var mongoose = require('mongoose');
var Schema = mongoose.Schema;

userSchema = new Schema( {
	username: String,
	verifier: String,
	salt: String,
	K: String,
	b: String
}),
user = mongoose.model('user', userSchema);

module.exports = user;