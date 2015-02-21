# signalRJS
===

A Node.js server implementation of [Signalr](http://signalr.net/).  It works with the [2.0 signalr javascript client](https://github.com/SignalR/bower-signalr)

[![Build Status](https://travis-ci.org/tjchaplin/signalRJS.svg?branch=master)](https://travis-ci.org/tjchaplin/signalRJS)

# Install

```
npm install signalrjs
```

# Quick Start - Persistent Connection

## The Server

```javascript
var express = require('express');
var SignalRJS = require('signalrjs');

var signalR = SignalRJS();

var server = express();
server.use(signalR.createListener())
server.use(express.static(__dirname));
server.listen(3000);

signalR.on('CONNECTED',function(){
	console.log('connected');
	setInterval(function () {
		signalR.send({time:new Date()});
	},1000)
});
```

## The Client

```html
<!DOCTYPE html>
<html xmlns="">
<head>
    <script src="bower_components/jquery/dist/jquery.js" type="text/javascript"></script>
    <script src="bower_components/signalr/jquery.signalR.js" type="text/javascript"></script>
    <script type="text/javascript">
        $(function () {
            var connection = $.connection('/signalr');
            connection.error(function(error){
                console.log(error);
            });
            connection.received(function (data) {
                console.log('The time is ' + data.time.toString());
            });

            connection.start().done(function() {
                console.log("connection started!");
            });
        });
    </script>
</head>
<body>
</body>
</html>
```

# Quick Start - Hub Connection

##The Server

```javascript
var express = require('express');
var SignalRJS = require('signalrjs');

//Init SignalRJs
var signalR = SignalRJS();

//Create the hub connection
//NOTE: Server methods are defined as an object on the second argument
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
```

##The Client

```html
<!DOCTYPE html>
<html>
<head>
    <title></title>
    <script src="bower_components/jquery/dist/jquery.js" type="text/javascript"></script>
    <script src="bower_components/signalr/jquery.signalR.js" type="text/javascript"></script>
    <script src="signalr/hubs"></script>
    <script type="text/javascript">
        $(function () {
        	//Create hub connection
            var connection = $.connection.hub;
            var chatHub = $.connection.chatHub;

            //Handle a broadcast
            chatHub.client.broadcast = function (broadcastMessage) {
            	console.log(broadcastMessage);
            };

            $.connection.hub.start().done(function () {
                $('#sendmessage').click(function () {
                	//Call the hub server send
                    chatHub.server.send('A Message');
                });
            });
        });
    </script>
</head>
<body>
	<input type="button" id="sendmessage" value="Send" />
</body>
</html>
```

# Purpose

The purpose of this project is to allow developers to use a non .Net platform with SignalR.    

The main benefit of this implementation is that it allows front end developers to quickly mockup a Signalr implementation without having to worry about the .Net server side development.  The implementation is not 100% complete, and is not intended for production.

# Supported Transports

The implementation currently supports the following transports:
* Long Polling - IE > 10
* Server Sent Events - Chrome, Firefox, etc

# Examples
Check out the Docs section to see an examples for:
* A Time server
* A chat server
* A private server
* A chat server with passport authentication

# Supported Connections

## Hubs

### Hub Servers
Hubs define a connection by a name, and a set of available methods.  Signalr makes the server methods '*directly*' callable within the client application like.  Given a client as follows:
```
var connection = $.connection.hub;
var chatHub = $.connection.chatHub

chatHub.server.send('A Message');
```

The server would need to have the 'send' method defined in the 'chatHub' as follows:
```javascript
signalR.hub('chatHub',{
	send : function(message){

	}
});
```

Finally, to have the send method communicate to the clients, the server needs to make a call to all clients.  This can be done within a server method by calling the following:
```
//invoke specifies the name of the client function to call
//withArgs specifies the arguments to call the function with
this.clients.all.invoke('broadcast').withArgs([message])
```

The client would then have the following method defined:
```javascript
chatHub.client.broadcast = function (message) {
	console.log('some message:'+message)
};
```

Now the server can communicate to the clients.

# Handling User
These methods are provided to make it easier to set a user for a connection.  If you ar using Signalr .Net you would use Integrated authentication, since signalrjs uses node.js it handles user authentication slightly differet.

## With the client
Signalrjs provides the ability for clients to set the user name for a connection. NOTE: **this is non-standard** and is not part of the Signalr.

In the client this can be done as follows:
```javascript
$.connection.hub.start().done(function () {
    $.connection.$user('anyUserName');
});
```
NOTE: setting a user can only be done after the connection has been set;
See the privateChat example to see this in action.

# With Passport
Passport provides the ability to use several *strategies* to manage user authentication.  If you use passport, then signalrjs will automatically set the user for a particular connection.
See the passportChat example to see this in action.

