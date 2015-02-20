'use strict';
var fs = require('fs');
var path = require('path');

module.exports = {
	create : function (hubs,cb) {
		fs.readFile(path.resolve(__dirname+'/templateHub.js'),function(err,data){
			if(err)
				console.log(err);
			var proxyScript = '';
			hubs.forEach(function(hub){
				proxyScript += 'proxies["'+hub.name+'"] = this.createHubProxy("'+hub.name+'");';
				proxyScript += 'proxies["'+hub.name+'"].client = { };';
				proxyScript += 'proxies["'+hub.name+'"].server = {';
				var writeLeadingComma = false;
				for(var hubFunctionName in hub.functions){
					if(writeLeadingComma)
						proxyScript += ',';
					proxyScript += hubFunctionName+': function () {';
					proxyScript += 'return proxies["'+hub.name+'"].invoke.apply(proxies["'+hub.name+'"], $.merge(["'+hubFunctionName+'"], $.makeArray(arguments)));';
					proxyScript += '}';
					writeLeadingComma = true;
				}
				proxyScript += '};';
			});

			data = data.toString().replace('{{PROXY_SECTION}}',proxyScript);
			if(cb)
				cb(data.toString());
		});
	}
};