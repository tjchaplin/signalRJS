'use strict';
var objectExtn = require('./objectExtensions');

module.exports = function minify(message){
	var minMessage = {};
	if(objectExtn.hasValue(message.MessageId))
		minMessage.C = message.MessageId;
	if(objectExtn.hasValue(message.LongPollDelay))
		minMessage.L = message.LongPollDelay;
	if(objectExtn.hasValue(message.Initialized))
		minMessage.S = message.Initialized;
	if(objectExtn.hasValue(message.ShouldReconnect))
		minMessage.T = message.ShouldReconnect;
	if(objectExtn.hasValue(message.GroupsToken))
		minMessage.G = message.GroupsToken;
	if(objectExtn.hasValue(message.Hub))
		minMessage.H = message.Hub;
	if(objectExtn.hasValue(message.Method))
		minMessage.M = message.Method;
	if(objectExtn.hasValue(message.Args))
		minMessage.A = message.Args;
	if(objectExtn.hasValue(message.State))
		minMessage.S = message.State;
	if(objectExtn.hasValue(message.Messages)){
		if(typeof message.Messages === 'string')
			minMessage.M = message.Messages;
		if(message.Messages instanceof Array)
			message.Messages = message.Messages.map(minify);
		if(typeof message.Messages === 'object')
			minMessage.M = minify(message.Messages);
	}
	if(Object.keys(minMessage).length === 0)
		return message;
	
	return minMessage;
};