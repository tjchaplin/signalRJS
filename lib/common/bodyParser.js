var qs = require('querystring');

module.exports = function(){
	return function(req,res,next){
		if(!next)
			return;

		if(req.body)
			return next();

	    if (req.method !== 'POST')
	    	return next();

		var body = '';
		req.on('data', function (data) {
			body += data;
		});
		req.on('end', function () {
			req.body = qs.parse(body);
			next();
		});
	};
};