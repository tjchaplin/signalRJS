'use strict';

var messageFactory = require('../common/messageFactory');

module.exports = {
	_connectionDetails : {
		"MessageId": + new Date(),
		"LongPollDelay": 0,
		"Initialized": true,
		"Messages" : []
	},
	connect : function(connection){
		connection.writeHead(200, {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-cache'
		});
		connection.write(messageFactory.connectionResponse(this._connectionDetails));
		connection.end();
		connection.didSend = true;
	},
	send : function(connection,messageData){
		if(connection.didSend) return;
		connection.didSend = true;
		connection.writeHead(200, {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-cache'
		});
		connection.write(messageFactory.message(messageData));
		connection.end();
	}
};