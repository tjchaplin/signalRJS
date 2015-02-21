'use strict';

var util = require('util');
var url = require('url');
var events = require('events');
var uuid = require('node-uuid');
var hubs = require('./hubs/hubs');
var bodyParser = require('./common/bodyParser');
var sseTransport = require('./transports/sseTransport');
var EVENT_CONSTANTS = require('./common/eventConstants');
var TRANSPORT_TYPES = require('./transports/transportTypes');
var ConnectionManager = require('./connections/connectionManager');
var longPollingTransport = require('./transports/longPollingTransport');

var getRequestToken = function(req){
	return req.query.connectionToken;
};
var getRequestUser = function(req){
	if(req.user)
		return req.user.userName;
};
var getRequestTransportType = function(req){
	if(req.query)
		return req.query.transport;
	return TRANSPORT_TYPES.unknown;
};
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
		"LongPollDelay":0.0,
		"HeartBeatInterval" : 15000
	};
	this._transports = {};
	this._transports[TRANSPORT_TYPES.serverSentEvents] = sseTransport;
	this._transports[TRANSPORT_TYPES.longPolling] = longPollingTransport;
	this._connectionManager = new ConnectionManager();
	this.heartBeat(this.serverProperties.HeartBeatInterval);
};

util.inherits(SignalRJS,events.EventEmitter);

SignalRJS.prototype.start = function(req,res){
	res.writeHead(200, {'Content-Type': 'application/json'});
	res.write(JSON.stringify({"Response": "started"}));
	res.end();
	this.emit(EVENT_CONSTANTS.connected);
};

SignalRJS.prototype.connect = function(req,res){
	var user = getRequestUser(req);
	var token = getRequestToken(req);
	var transportType = getRequestTransportType(req);
	if(!this._transports[transportType])
		return res.end();
	this._transports[transportType].connect(res);
	this._connectionManager.put(user,token,transportType,res);
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

SignalRJS.prototype.heartBeat = function(heartBeatInterval){
	var self = this;
	setInterval(function(){
		self._connectionManager.forEach(function(connection){
			var transport = self._transports[connection.type];
			if(transport && transport.sendHeartBeat)
				transport.sendHeartBeat(connection.connection);
		});
	},heartBeatInterval);
};

SignalRJS.prototype.poll = function(req,res){
	var self = this;
	var token = getRequestToken(req);
	this._connectionManager.updateConnection(token,res);
	setTimeout(function(){
		var connection = self._connectionManager.getByToken(token);
		var transport = self.transport[connection.type];
		if(transport)
			transport.send(connection,[]);
	},30000);
};

SignalRJS.prototype.ping = function(req,res){
	res.writeHead(200, {"Content-Type": "application/json"});
	res.write(JSON.stringify({"Response":"pong"}));
	res.end();	
};

SignalRJS.prototype.abort = function(req,res){
	var token = getRequestToken(req);
	this._connectionManager.delByToken(token);
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
		var user = connectionUser.user;
		var token = connectionUser.token;
		self._connectionManager.setUserToken(user, token);
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
			return self.poll(req,res);
		if(path === self.route + '/send')
			return self.hubRoute(req,res);
		if(path === self.route + '/user')
			return self.setUser(req,res);
		
		if(next)
			next(req,res);
	};
};

SignalRJS.prototype.broadcast = function(messageData) {
	var self = this;
	this._connectionManager.forEach(function(connection){
		var transport = self._transports[connection.type];
		if(transport)
			transport.send(connection.connection,messageData);
	});
};

SignalRJS.prototype.sendToUser = function(user,messageData) {
	var connection = this._connectionManager.getByUser(user);
	if(!connection)
		return;
	var transport = this._transports[connection.type];
	if(transport)
		transport.send(connection.connection,messageData);
};

module.exports = SignalRJS;