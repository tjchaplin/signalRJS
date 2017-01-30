var express = require('express');
var http = require('http');
var SignalRJS = require('../../../index');
var EVENT_CONSTANTS = require('../../../lib/common/eventConstants');

var signalR = SignalRJS();
signalR.hub('chatHub',{
	send : function(userName,message){
		this.clients.all.invoke('broadcast').withArgs([userName,message])
		console.log('send:'+message);
	}
});
var app = express();
app.use(express.static(__dirname));
app.use(signalR.createListener())

var server = http.createServer();
signalR.createWsListener(server);

server.on('request', app);
server.listen(3000);

signalR.on(EVENT_CONSTANTS.connected,function(){
	console.log('connected');
})