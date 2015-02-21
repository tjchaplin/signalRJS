'use strict';

module.exports = function(){
	return {
		_userTokens : {},
		put : function(user, token){
			if(!user || !token)
				return;
			this._userTokens[user] = token;
		},
		getByUser : function(user){
			if(user)
				return this._userTokens[user];
		},
		delByUser : function(user){
			if(user)
				delete this._userTokens[user];
		},
		delByToken : function(token){
			if(!token)
				return;

			for(var user in this._userTokens){
				if(this._userTokens[user] === token)
					delete this._userTokens[user];
			}
		}
	};
};