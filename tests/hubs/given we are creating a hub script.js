var fs = require('fs');
var path = require('path');
var assert = require('assert');
var hubScriptFactory = require('../../lib/hubs/hubScriptFactory');

describe('',function () {
	it('',function(done){
		var hubDefin = {
			name : 'hubName',
			functions : {
				func1:function(){},
				func2:function(){}
			}
		};
		hubScriptFactory.create([hubDefin],function(script){
			//fs.writeFileSync(path.resolve(__dirname)+'/actual.js',script);
			fs.readFile(path.resolve(__dirname+'/expectedHubOutput.js'),function(err,data){
				assert(script === data.toString());
				done();
			});
		});
	});
});