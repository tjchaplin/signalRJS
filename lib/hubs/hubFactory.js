'use strict';
var assert = require('assert');
var expandify = require('../common/expandify');

var createClientMessage = function(hubName,hubClients){
	if(hubClients._calls.length === 0)
		return;

	var clientCall = hubClients._calls.pop();
	return {
		user : clientCall.user,
		callData : {
			State : 1,
			Hub : hubName,
			Args : clientCall.args,
			Method : clientCall.method
		}
	};
};

module.exports = function(hubName,hubObject){
	var invoke = function(functionName,user){
			return {
				withArgs : function(args){
					if(!(args instanceof Array))
						args = Array.prototype.slice.call(arguments);
					var call = {method:functionName,args:args};
					if(user)
						call.user = user;
					hubObject.clients._calls.push(call);
				}
			};
		};
	hubObject.clients = {
		_calls : [],
		all : {
			invoke : invoke
		},
		user : function(userName){
			return {
				invoke : function(functionName){
					return invoke(functionName,userName);
				}
			};
		}
	};
	return {
		name : hubName,
		functions : hubObject,
		getHubCall : function(data){
			var minHubCall = JSON.parse(data);
			var hubCall = expandify(minHubCall);
			if(!hubCall.Hub)
				return;
			if(hubCall.Hub.toLowerCase() !== this.name.toLowerCase())
				return;
			if(!hubCall.Method)
				return;
			if(this.functions[hubCall.Method])
				return hubCall;
		},
		createClientResponse : function(data,cb){
			assert(cb);
			var hubCall = this.getHubCall(data);

			if(!hubCall) {
				hubCall = {
					Method: 'send',
					Args: []
				}
			}

			this.functions[hubCall.Method].apply(this.functions, hubCall.Args);
			var message = createClientMessage(this.name, this.functions.clients) || {};
			cb(null, message.callData, message.user);
		}
	};
};
