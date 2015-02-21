'use strict';
var url = require('url');
var TRANSPORT_TYPES = require('../transports/transportTypes');

module.exports = function(){
	var getRequestToken = function(req){
		if(req.query && req.query.connectionToken)
			return req.query.connectionToken;
		if(req.body)
			return req.body.token;
	};
	var getRequestUser = function(req){
		if(req.user)
			return req.user.userName;
		if(req.body)
			return req.body.user;
	};
	var getRequestTransportType = function(req){
		if(req.query)
			return req.query.transport;
		return TRANSPORT_TYPES.unknown;
	};
	return function(req, res, next){
		if(!req.query)
			req.query = url.parse(req.url,true).query || {};

		var signalrjs = {};
		if(req.signalrjs)
			signalrjs = req.signalrjs;
		
		signalrjs.user = getRequestUser(req);
		signalrjs.token = getRequestToken(req);
		signalrjs.transportType = getRequestTransportType(req);

		req.signalrjs = signalrjs;

		if(next)
			next();
	};
};
