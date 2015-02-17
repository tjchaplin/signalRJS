'use strict';
var qs = require('querystring');
var expandify = require('../common/expandify');

var getFormData = function(req,res,cb){
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
		Hub : hubName,
		Method : clientCall.method,
		Args : clientCall.args,
		State : 1
	};
};

module.exports = function(hubName,hubObject){
	hubObject.clients = {
		_calls : [],
		all : {
			invoke : function(functionName){
				return {
					withArgs : function(args){
						if(!(args instanceof Array))
							args = Array.prototype.slice.call(arguments);
						hubObject.clients._calls.push({method:functionName,args:args});
					}
				};
			}
		}
	};
	return {
		name : hubName,
		functions : hubObject,
		getHubRoute : function(requestPath,basePath){
			if(!basePath)
				basePath = '';

			for(var hubRoute in this.functions){
				if(requestPath === basePath+'/'+hubRoute)
					return hubRoute;
			}
		},
		createClientResponse : function(hubRoute,req,res,cb){
			var self = this;
			getFormData(req,res,function(formData){
				if(formData.Hub.toLowerCase() !== self.name.toLowerCase())
					return;
				self.functions[hubRoute].apply(self.functions,formData.Args);
				var message = createClientMessage(self.name,self.functions.clients);
				if(cb)
					cb(message);
			});
		}
	};
};