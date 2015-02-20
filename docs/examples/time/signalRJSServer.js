var express = require('express');
var SignalRJS = require('../../../index');
var EVENT_CONSTANTS = require('../../../lib/common/eventConstants');

var signalR = SignalRJS();
var server = express();
server.use(signalR.createListener())
server.use(express.static(__dirname));
server.listen(3000);
signalR.on(EVENT_CONSTANTS.connected,function(){
	console.log('connected');
	setInterval(function () {
		signalR.broadcast({time:new Date()});
	},1000)
	
})