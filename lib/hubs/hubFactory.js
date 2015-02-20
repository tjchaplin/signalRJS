'use strict';
var assert = require('assert');
var qs = require('querystring');
var expandify = require('../common/expandify');

var getFormData = function(req,cb){
	if(req.body)
		return cb(expandify(JSON.parse(req.body.data)));

    if (req.method !== 'POST')
    	return cb();

	var body = '';
	req.on('data', function (data) {
		body += data;
	});
	req.on('end', function () {
		var formData = JSON.parse(qs.parse(body).data);
		cb(expandify(formData));
	});
};

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
					var call = {method:functionName,args:args}
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
			}
		}
	};
	return {
		name : hubName,
		functions : hubObject,
		getHubCall : function(req,cb){
			assert(cb);
			var self = this;
			getFormData(req,function(formData){
				if(formData.Hub.toLowerCase() !== self.name.toLowerCase())
					return cb();
				if(!formData.Method)
					return cb();
				if(self.functions[formData.Method])
					return cb(null,formData.Method,formData.Args);
				cb();
			});
		},
		createClientResponse : function(req,cb){
			assert(cb);
			var self = this;
			this.getHubCall(req,function(err,methodName,args){
				if(err)
					cb(err);
				if(!methodName || !args)
					return cb();
				self.functions[methodName].apply(self.functions,args);
				var message = createClientMessage(self.name,self.functions.clients);
				cb(null,message.callData,message.user);
			});
		}
	};
};