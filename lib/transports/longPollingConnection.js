'use strict';

var fs = require('fs');
var url = require('url');
var path = require('path');
var messageFactory = require('../common/messageFactory');

module.exports = {
	_connectionDetails : {
		"MessageId": + new Date(),
		"LongPollDelay": 0,
		"Initialized": true,
		"Messages" : []
	},
	connect : function(req,res,next){
		res.writeHead(200, {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-cache'
		});
		res.write(messageFactory.connectionResponse(this._connectionDetails));
		res.end();
		res.didSend = true;
		if(next)
			next(req,res);
	},
	handlePoll : function(req,res,next){
		var self = this;
		setTimeout(function(){
			self.send(res,[]);
		},30000);
	},
	send : function(res,messageData) {
		if(res.didSend) return;
		res.didSend = true;
		res.writeHead(200, {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-cache'
		});
		res.write(messageFactory.message(messageData));
		res.end();
	}
};