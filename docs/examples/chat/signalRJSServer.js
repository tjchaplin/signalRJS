var express = require('express');
var SignalRJS = require('../../../index');
var EVENT_CONSTANTS = require('../../../lib/common/eventConstants');

var signalR = SignalRJS();
signalR.hub('chatHub',{
	send : function(userName,message){
		this.clients.all.invoke('broadcast').withArgs([userName,message])
		console.log('send:'+message);
	}
});
var server = express();
server.use(express.static(__dirname));
server.use(signalR.createListener())
server.listen(3000);
signalR.on(EVENT_CONSTANTS.connected,function(){
	console.log('connected');
})