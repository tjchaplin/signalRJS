'use strict';

module.exports = {
	hasValue : function(value){
		if(value === null)
			return false;
		if(value === undefined)
			return false;
		return true;
	}
};