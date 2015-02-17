var fs = require('fs');
var path = require('path');
var assert = require('assert');
var hubScriptFactory = require('../../lib/hubs/hubScriptFactory');

// SignalR.hub('hubName',{
// 	function1 : function(){

// 	},
// 	function2 : function(){

// 	}
// })

describe('',function () {
	it('',function(done){
		var hubDefin = {
			name : 'hubName',
			functions : {
				func1:function(){},
				func2:function(){}
			}
		};
		var hubScript = hubScriptFactory.create([hubDefin],function(script){
			fs.readFile(path.resolve(__dirname+'/expectedHubOutput.js'),function(err,data){
				assert(script === data.toString());
				done();
			});
		});
	});
});