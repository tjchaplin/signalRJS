'use strict';

var util = require('util');
var url = require('url');
var events = require('events');
var uuid = require('node-uuid');
var qs = require('querystring');
var hubFactory = require('./hubs/hubFactory');
var messageFactory = require('./common/messageFactory');
var EVENT_CONSTANTS = require('./common/eventConstants');
var sseTransport = require('./transports/sseTransport');
var hubScriptFactory = require('./hubs/hubScriptFactory');
var longPollingTransport = require('./transports/longPollingTransport');

var SignalRJS = function(){
	if(!(this instanceof SignalRJS))
		return new SignalRJS();
	
	this.hubDefns = [];
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
		if(transport.hasConnectionToken(req.query.connectionToken))
			return transport.abort(req.query.connectionToken);
	});
	res.writeHead(200, {"Content-Type": "application/json"});
	res.write(JSON.stringify({"Response":"aborted"}));
	res.end();
};

SignalRJS.prototype.hub = function(hubName,hubObject){
	var hubDefn = hubFactory(hubName,hubObject);
	this.hubDefns.push(hubDefn);
	return this;
};

SignalRJS.prototype.hubs = function(req,res){
	hubScriptFactory.create(this.hubDefns,function(clientHubScript){
		res.writeHead(200, {"Content-Type": "application/javascript"});
		res.write(clientHubScript.toString());
		res.end();	
	});
};

SignalRJS.prototype.hubRoute = function(req,res,next){
	var self = this;
	var path = url.parse(req.url).pathname;
	var foundRoute = false;
	this.hubDefns.forEach(function(hub){
		if(foundRoute) return;
		var hubRoute = hub.getHubRoute(path,self.route);
		if(!hubRoute) return;
		foundRoute = true;
		hub.createClientResponse(hubRoute,req,res,function(clientResponse){
			res.writeHead(200, {"Content-Type": "application/json"});
			res.end();
			self.send(clientResponse);
		});
	});

	if(next && !foundRoute)
		next();

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

		self.hubRoute(req,res,next);
	};
};

SignalRJS.prototype.send = function(messageData) {	
	this.transports.forEach(function(transport){
		transport.broadcast(messageData);
	});
};

module.exports = SignalRJS;