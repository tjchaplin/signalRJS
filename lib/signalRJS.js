'use strict';

var util = require('util');
var events = require('events');
var uuid = require('node-uuid');
var connect = require('connect');
var hubs = require('./hubs/hubs');
var bodyParser = require('./common/bodyParser');
var queryParser = require('./common/queryParser');
var sseTransport = require('./transports/sseTransport');
var EVENT_CONSTANTS = require('./common/eventConstants');
var TRANSPORT_TYPES = require('./transports/transportTypes');
var ConnectionManager = require('./connections/connectionManager');
var signalrRequestParser = require('./common/signalrRequestParser');
var longPollingTransport = require('./transports/longPollingTransport');

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

SignalRJS.prototype.start = function(req,res,next){
	res.writeHead(200, {'Content-Type': 'application/json'});
	res.write(JSON.stringify({"Response": "started"}));
	res.end();
	this.emit(EVENT_CONSTANTS.connected);
	next();
};

SignalRJS.prototype.connect = function(req,res,next){
	var user = req.signalrjs.user;
	var token = req.signalrjs.token;
	var transportType = req.signalrjs.transportType;
	if(!this._transports[transportType]){
		res.end();
		next();
		return;
	}
	this._transports[transportType].connect(res);
	this._connectionManager.put(user,token,transportType,res);
	next();
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

SignalRJS.prototype.negotiate = function(req,res,next){
	var connectionProperties = this.createNewConnectionProperties();
	res.writeHead(200, {"Content-Type": "application/json"});
	res.write(JSON.stringify(connectionProperties));
	res.end();
	next();
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

SignalRJS.prototype.poll = function(req,res,next){
	var self = this;
	var token = req.signalrjs.token;
	this._connectionManager.updateConnection(req.signalrjs.token,res);
	setTimeout(function(){
		var connection = self._connectionManager.getByToken(token);
		var transport = self.transport[connection.type];
		if(transport)
			transport.send(connection,[]);
	},30000);
	next();
};

SignalRJS.prototype.ping = function(req,res,next){
	res.writeHead(200, {"Content-Type": "application/json"});
	res.write(JSON.stringify({"Response":"pong"}));
	res.end();
	next();
};

SignalRJS.prototype.abort = function(req,res,next){
	var token = req.signalrjs.token;
	this._connectionManager.delByToken(token);
	res.writeHead(200, {"Content-Type": "application/json"});
	res.write(JSON.stringify({"Response":"aborted"}));
	res.end();
	next();
};

SignalRJS.prototype.hub = function(hubName,hubObject){
	hubs.add(hubName,hubObject);
	return this;
};

SignalRJS.prototype.hubs = function(req,res,next){
	hubs.getClientScript(function(clientHubScript){
		res.writeHead(200, {"Content-Type": "application/javascript"});
		res.write(clientHubScript);
		res.end();
		next();
	});
};

SignalRJS.prototype.setUser = function(req,res,next){
	if(!req.signalrjs) 
		return;
	var user = req.signalrjs.user;
	var token = req.signalrjs.token;
	this._connectionManager.setUserToken(user, token);
	res.writeHead(200, {"Content-Type": "application/json"});
	res.end();
	next();
};

SignalRJS.prototype.hubRoute = function(req,res,next){
	var self = this;
	hubs.parseMessage(req,function(responseMsg,toUser){
		res.writeHead(200, {"Content-Type": "application/json"});
		res.end();
		if(toUser)
			return self.sendToUser(toUser,responseMsg);
		self.broadcast(responseMsg);
		next();	
	});
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

SignalRJS.prototype.createListener = function(){
	var app = connect();
	var self = this;
	app.use(bodyParser());
	app.use(signalrRequestParser());
	app.use(self.route+'/hubs', function(req,res,next){self.hubs(req,res,next);});
	app.use(self.route+'/poll', function(req,res,next){self.poll(req,res,next);});
	app.use(self.route+'/send', function(req,res,next){self.hubRoute(req,res,next);});
	app.use(self.route+'/user', function(req,res,next){self.setUser(req,res,next);});
	app.use(self.route+'/ping', function(req,res,next){self.ping(req,res,next);});
	app.use(self.route+'/start', function(req,res,next){self.start(req,res,next);});
	app.use(self.route+'/abort', function(req,res,next){self.abort(req,res,next);});
	app.use(self.route+'/connect', function(req,res,next){self.connect(req,res,next);});
	app.use(self.route+'/negotiate', function(req,res,next){self.negotiate(req,res,next);});
	
	return app;
};

module.exports = SignalRJS;