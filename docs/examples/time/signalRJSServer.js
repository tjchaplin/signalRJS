var express = require('express');
var http = require('http');
var SignalRJS = require('../../../index');
var EVENT_CONSTANTS = require('../../../lib/common/eventConstants');

var signalR = SignalRJS();
var app = express();
app.use(signalR.createListener())
app.use(express.static(__dirname));

var server = http.createServer()
signalR.createWsListener(server)
server.on('request', app)
server.listen(3000);
signalR.on(EVENT_CONSTANTS.connected,function(){
	console.log('connected');
	setInterval(function () {
		signalR.broadcast({time:new Date()});
	},1000)

})