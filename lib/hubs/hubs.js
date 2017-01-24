'use strict';

var hubFactory = require('./hubFactory');
var hubScriptFactory = require('./hubScriptFactory');

module.exports = {
	_hubDefns : [],
	add : function (hubName,hubFunctions) {
		var hubDefn = hubFactory(hubName,hubFunctions);
		this._hubDefns.push(hubDefn);
	},
	getClientScript : function(cb){
		hubScriptFactory.create(this._hubDefns,cb);
	},
    parseMessage : function(data,cb){
		this._hubDefns.forEach(function(hub){
			hub.createClientResponse(data,function(err,clientResponse,to){
				if(err	|| !clientResponse) 
					return;
				cb(clientResponse,to);
			});
		});
	},
};