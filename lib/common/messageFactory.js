'use strict';

var minify = require('./minify');

module.exports = {
	connectionResponse : function(responseObject){
		var defaultResponseObject = {
			"MessageId": + new Date(),
			"LongPollDelay": 5000, 
			"Initialized": true,
			"ShouldReconnect" : false,
			"GroupsToken" : null,
			"Messages" : []
		};
		if(!responseObject)
			responseObject = defaultResponseObject;
		return JSON.stringify(minify(responseObject));
	},
	message : function (messageData) {
		if(!messageData)
			return '{}';
		
		if(!(messageData instanceof Array))
			messageData = [messageData];

		var message = {
			"MessageId": + new Date(),
			"Messages" : messageData
		};
		return JSON.stringify(minify(message));
	},
	response : function(responseData){
		return JSON.stringify(minify(responseData));	
	}
};