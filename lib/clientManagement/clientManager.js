'use strict';

module.exports = function(){
	return {
			_clients : {},
			_clientConnectionTokens : {},
			_getConnectionManagerId : function(req){
				var user = null;
				if(req.user)
					user = req.user.userName;
				
				return {
					user : user,
					connectionToken : req.query.connectionToken
				}
			},
			get : function(req,cb){
				var client = null;
				var id = this._getConnectionManagerId(req);
				if(id.connectionToken)
					client = this._clients[id.connectionToken];
				if(cb)
					cb(client);
				return client;
			},
			getByUser : function(user,cb){
				var client = null;
				if(user && this._clientConnectionTokens[user]){
					var connectionToken = this._clientConnectionTokens[user]
					client = this._clients[connectionToken];
				}

				if(cb)
					cb(client);
				return client;
			},
			getByConnectionToken : function(connectionToken,cb){
				var client = null;
				if(connectionToken && this._clients[connectionToken])
					client = this._clients[connectionToken];
				if(cb)
					cb(client);
				return client;
			},
			_canSetUser : function(connectionUser){
				if(!connectionUser)
					return false;
				if(!connectionUser.connectionToken || !connectionUser.user)
					return false;
				if(!this._clients[connectionUser.connectionToken])
					return false;
				return true;
			},
			setConnectionUser : function(connectionUser){
				if(!this._canSetUser(connectionUser))
					return;
				this._clientConnectionTokens[connectionUser.user] = connectionUser.connectionToken;
			},
			put : function(req,value,cb){
				var id = this._getConnectionManagerId(req);
				this._clients[id.connectionToken] = value;
				if(id.user)
					this.setConnectionUser(id);
			},
			del : function(req,cb){
				var id = this._getConnectionManagerId(req);
				if(this._clients[id.connectionToken])
					delete this._clients[id.connectionToken];
				if(id.user && this._clientConnectionTokens[id.user])
					delete this._clientConnectionTokens[id];
				if(cb)
					cb();
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