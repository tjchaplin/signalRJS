'use strict';

var util = require('util');
var url = require('url');
var events = require('events');
var uuid = require('node-uuid');
var EVENT_CONSTANTS = require('./common/eventConstants');
var sseConnection = require('./transports/sseConnection');
var TRANSPORT_TYPES = require('./transports/transportTypes');
var clientManager = require('./clientManagement/clientManager');

var SignalRJS = function(){
	if(!(this instanceof SignalRJS))
		return new SignalRJS();

	this.route = '/signalr';
	this.serverProperties = {
		"KeepAliveTimeout":20.0,
		"DisconnectTimeout":30.0,
		"ConnectionTimeout":110.0,
		"TryWebSockets":false,
		"ProtocolVersion":"1.5",
		"TransportConnectTimeout":5.0,
		"LongPollDelay":0.0
	};
};

util.inherits(SignalRJS,events.EventEmitter);

SignalRJS.prototype.start = function(req,res){
	res.writeHead(200, {'Content-Type': 'application/json'});
	var startedResponse = {"Response": "started"};
	res.write(JSON.stringify(startedResponse));
	res.end();
	this.emit(EVENT_CONSTANTS.connected)
};

SignalRJS.prototype.connect = function(req,res){
	var onConnect = function(connectionReq,connectionRes){
		var connectionToken = connectionReq.query.connectionToken;
		connectionRes.transport = connectionReq.query.transport;
		clientManager.put(connectionToken,connectionRes);
	};

	if(req.query.transport === TRANSPORT_TYPES.serverSentEvents)
		sseConnection.connect(req,res,onConnect);
};

SignalRJS.prototype.createNewConnectionProperties = function(){
	var connectionProperties = {};
	for(var prop in this.serverProperties)
		connectionProperties[prop] = this.serverProperties[prop];
	connectionProperties.ConnectionId = uuid.v4();
	connectionProperties.ConnectionToken = uuid.v4();
	connectionProperties.Url = this.route;
	return connectionProperties;
};

SignalRJS.prototype.negotiate = function(req,res){
	var connectionProperties = this.createNewConnectionProperties();
	res.writeHead(200, {"Content-Type": "application/json"});
	res.write(JSON.stringify(connectionProperties));
	res.end();
};

SignalRJS.prototype.ping = function(req,res){
	res.writeHead(200, {"Content-Type": "application/json"});
	res.write(JSON.stringify({"Response":"pong"}));
	res.end();	
};

SignalRJS.prototype.abort = function(req,res){
	var connectionToken = req.query.connectionToken;
	clientManager.del(connectionToken);
	res.writeHead(200, {"Content-Type": "application/json"});
	res.write(JSON.stringify({"Response":"aborted"}));
	res.end();	
};

SignalRJS.prototype.createListener = function(){
	var self = this;
	return function(req, res, next) {

		if(!req.query)
			req.query = url.parse(req.url,true).query || {};

		var path = url.parse(req.url).pathname;
		if(path	 === self.route	+'/ping')
			self.ping(req, res);
		if(path === self.route+'/start')
			self.start(req,res);
		if(path === self.route+'/abort')
			self.abort(req,res);
		if(path === self.route+'/connect')
			self.connect(req,res);
		if(path === self.route + '/negotiate')
			self.negotiate(req,res);

		if(next)
			next();
	};
};

SignalRJS.prototype.send = function(messageData) {		
	clientManager.getAll(function(clients){
		clients.forEach(function(client){
			if(client.transport === TRANSPORT_TYPES.serverSentEvents)
				sseConnection.send(client,messageData);
		});
	});
	
};

module.exports = SignalRJS;