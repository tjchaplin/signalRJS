'use strict';

var url = require('url');
var messageFactory = require('../common/messageFactory');

var writeServerSendEvent = function (res, data, id) {
	if(id)
  		res.write('id: ' + id + '\n');

  res.write("data: " + data + '\n\n');
};

module.exports = {
	_connectionDetails : {
		"MessageId": + new Date(),
		"LongPollDelay": 5000, 
		"Initialized": true,
		"ShouldReconnect" : false,
		"GroupsToken" : null,
		"Messages" : []
	},
	connect : function(req,res,next){
		res.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive'
		});
		writeServerSendEvent(res,"initialized");
		writeServerSendEvent(res, messageFactory.connectionResponse(this._connectionDetails));
		if(next)
			next(req,res);
	},
	send : function(res,messageData) {
		writeServerSendEvent(res,messageFactory.message(messageData));
	}
};