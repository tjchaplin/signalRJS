'use strict';

var url = require('url');
var messageFactory = require('../common/messageFactory');
var TRANSPORT_TYPES = require('./transportTypes');
var ClientManager = require('../clientManagement/clientManager');

var writeServerSendEvent = function (res, data, id) {
	if(id)
  		res.write('id: ' + id + '\n');

  res.write("data: " + data + '\n\n');
};

module.exports = {
	_connectionManager : null,
	_connectionDetails : {
		"MessageId": + new Date(),
		"LongPollDelay": 5000, 
		"Initialized": true,
		"ShouldReconnect" : false,
		"GroupsToken" : null,
		"Messages" : [],
		"heartBeatInterval" : 15000
	},
	canConnect : function(req){
		if(req.query.transport === TRANSPORT_TYPES.serverSentEvents)
			return true;
		return false;
	},
	hasUser : function(user){
		if(this._connectionManager.getByUser(user))
			return true;
		return false;
	},
	setConnectionUser : function(connectionUser){
		this._connectionManager.setConnectionUser(connectionUser);
	},
	hasConnection : function(req){
		if(this._connectionManager.get(req))
			return true;
		return false;
	},
	hasConnectionToken : function(connectionToken){
		if(this._connectionManager.getByConnectionToken(connectionToken))
			return true;
		return false;
	},
	init : function(){
		this._connectionManager = new ClientManager();
		this.heartBeat(this._connectionDetails.heartBeatInterval);
	},
	connect : function(req,res){
		res.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive'
		});
		writeServerSendEvent(res,"initialized");
		writeServerSendEvent(res, messageFactory.connectionResponse(this._connectionDetails));
		this._connectionManager.put(req,res);
	},
	broadcast : function(messageData) {
		this._connectionManager.getAll(function(clients){
			clients.forEach(function(client){
				writeServerSendEvent(client,messageFactory.message(messageData));
			});
		});
	},
	sendToUser : function(user,messageData){
		var client = this._connectionManager.getByUser(user);
		if(client)
			writeServerSendEvent(client,messageFactory.message(messageData));
	},
	abort : function(req){
		this._connectionManager.del(req);	
	},
	heartBeat : function(heartBeatInterval){
		var self = this;
		setInterval(function(){
			self.broadcast();
		},heartBeatInterval);
	}
};