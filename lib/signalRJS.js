'use strict';

var util = require('util');
var url = require('url');
var events = require('events');
var uuid = require('node-uuid');
var hubs = require('./hubs/hubs');
var EVENT_CONSTANTS = require('./common/eventConstants');
var sseTransport = require('./transports/sseTransport');
var longPollingTransport = require('./transports/longPollingTransport');
var bodyParser = require('./common/bodyParser');

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
	this.transports = [sseTransport,longPollingTransport];
	this.transports.forEach(function(transport){
		transport.init();
	});
};

util.inherits(SignalRJS,events.EventEmitter);

SignalRJS.prototype.start = function(req,res){
	res.writeHead(200, {'Content-Type': 'application/json'});
	var startedResponse = {"Response": "started"};
	res.write(JSON.stringify(startedResponse));
	res.end();
	this.emit(EVENT_CONSTANTS.connected);
};

SignalRJS.prototype.connect = function(req,res){
	this.transports.forEach(function(transport){
		if(transport.canConnect(req))
			return transport.connect(req,res);
	});
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
	this.transports.forEach(function(transport){
		if(transport.hasConnection(req))
			return transport.abort(req);
	});
	res.writeHead(200, {"Content-Type": "application/json"});
	res.write(JSON.stringify({"Response":"aborted"}));
	res.end();
};

SignalRJS.prototype.hub = function(hubName,hubObject){
	hubs.add(hubName,hubObject);
	return this;
};

SignalRJS.prototype.hubs = function(req,res){
	hubs.getClientScript(function(clientHubScript){
		res.writeHead(200, {"Content-Type": "application/javascript"});
		res.write(clientHubScript);
		res.end();	
	});
};

SignalRJS.prototype.setUser = function(req,res){
	var self = this;
	bodyParser.parse(req,res,function(connectionUser){
		if(!connectionUser) 
			return;

		self.transports.forEach(function(transport){
			transport.hasConnectionToken(connectionUser.connectionToken)
				transport.setConnectionUser(connectionUser);
		});
		res.writeHead(200, {"Content-Type": "application/json"});
		res.end();
	});
};

SignalRJS.prototype.hubRoute = function(req,res){
	var self = this;
	hubs.parseMessage(req,function(responseMsg,toUser){
		res.writeHead(200, {"Content-Type": "application/json"});
		res.end();
		if(toUser)
			return self.sendToUser(toUser,responseMsg);
		self.broadcast(responseMsg);	
	});
};

SignalRJS.prototype.createListener = function(){
	var self = this;
	return function(req, res, next) {

		if(!req.query)
			req.query = url.parse(req.url,true).query || {};

		var path = url.parse(req.url).pathname;
		if(path	 === self.route	+'/ping')
			return self.ping(req, res);
		if(path === self.route+'/start')
			return self.start(req,res);
		if(path === self.route+'/abort')
			return self.abort(req,res);
		if(path === self.route+'/connect')
			return self.connect(req,res);
		if(path === self.route + '/negotiate')
			return self.negotiate(req,res);
		if(path === self.route + '/hubs')
			return self.hubs(req,res);
		if(path === self.route + '/poll')
			return longPollingTransport.poll(req,res);
		if(path === self.route + '/send')
			return self.hubRoute(req,res);
		if(path === self.route + '/user')
			return self.setUser(req,res);
		
		if(next)
			next(req,res);
	};
};

SignalRJS.prototype.broadcast = function(messageData) {	
	this.transports.forEach(function(transport){
		transport.broadcast(messageData);
	});
};

SignalRJS.prototype.sendToUser = function(user,messageData) {	
	this.transports.forEach(function(transport){
		if(transport.hasUser(user))
			return transport.sendToUser(user,messageData);
	});
};

module.exports = SignalRJS;