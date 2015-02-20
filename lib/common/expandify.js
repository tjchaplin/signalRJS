'use strict';
var objectExtn = require('./objectExtensions');

module.exports = function(minMessage){
	var message = {};
	if(objectExtn.hasValue(minMessage.H))
		message.Hub = minMessage.H;
	if(objectExtn.hasValue(minMessage.M))
		message.Method = minMessage.M;
	if(objectExtn.hasValue(minMessage.A))
		message.Args = minMessage.A;

	return message;
};