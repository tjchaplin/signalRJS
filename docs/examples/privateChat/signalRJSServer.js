var express = require('express');
var http = require('http');
var SignalRJS = require('../../../index');
var morgan = require('morgan');
var users = [];

var signalR = SignalRJS();
var server = http.createServer();

signalR.hub('chatHub',{
	broadcast : function(fromUserName,message){
		this.clients.all.invoke('broadcast').withArgs([fromUserName,message])
		console.log('broadcasting:'+message);
	},
	privateSend : function(fromUserName,toUserName,message){
		this.clients.user(toUserName).invoke('onPrivateMessage').withArgs([fromUserName,message])
		console.log('privateSend from('+fromUserName+') to('+toUserName+') message:'+message);
	}
});

var app = express();
app.use(morgan('dev'));
app.use(express.static(__dirname));
app.use(signalR.createListener())

signalR.createWsListener(server)

server.on('request', app);
server.listen(3000);

signalR.on('CONNECTED',function(){
	console.log('connected');
});

