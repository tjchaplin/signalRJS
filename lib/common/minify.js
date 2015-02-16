'use strict';

var hasValue = function(value){
	if(value === null)
		return false;
	if(value === undefined)
		return false;
	return true;
};

module.exports = function(message){
	var minMessage = {};
	if(hasValue(message.MessageId))
		minMessage.C = message.MessageId;
	if(hasValue(message.LongPollDelay))
		minMessage.L = message.LongPollDelay;
	if(hasValue(message.Initialized))
		minMessage.S = message.Initialized;
	if(hasValue(message.Messages))
		minMessage.M = message.Messages;
	if(hasValue(message.ShouldReconnect))
		minMessage.T = message.ShouldReconnect;
	if(hasValue(message.GroupsToken))
		minMessage.G = message.GroupsToken;

	return minMessage;
};