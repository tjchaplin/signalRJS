var qs = require('querystring');
module.exports = {
	parse : function(req,res,cb){
		if(req.body)
			return cb(req.body);

	    if (req.method !== 'POST')
	    	return cb();

		var body = '';
		req.on('data', function (data) {
			body += data;
		});
		req.on('end', function () {
			var formData = qs.parse(body);
			cb(formData);
		});
	}
};