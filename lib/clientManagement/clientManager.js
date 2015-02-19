'use strict';

module.exports = function(){
	return {
			_clients : {},
			get : function(id,cb){
				if(cb)
					cb(this._clients[id]);
				return this._clients[id];
			},
			put : function(id,value,cb){
				this._clients[id] = value;
			},
			del : function(id,cb){
				if(this._clients[id])
					delete this._clients[id];
			},
			getAll : function(cb){
				var mappedClients = [];
				for(var clientId in this._clients){
					mappedClients.push(this._clients[clientId]);
				}
				cb(mappedClients);
			}
		};
};