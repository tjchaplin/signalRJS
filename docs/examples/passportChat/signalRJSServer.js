var express = require('express');
var SignalRJS = require('../../../index');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var session = require('express-session');
var cookieParser = require('cookie-parser');
var morgan = require('morgan');
var bodyParser = require('body-parser');

var users = [];

function findById(id, cb) {
  if (!users[id])
  	return cb(new Error('User ' + id + ' does not exist'));

	cb(null, users[id]);
};

function findByUserName(userName, cb) {
	console.log(userName);
	if(!userName)
		cb(null,null);

	var userFound = false;
	users.forEach(function(user){
		if(user.userName === userName){
			userFound = true;
			return cb(null,user);
		}
	});
	if(!userFound){
		var newUser = {id:users.length,userName : userName}
		users.push(newUser);
		return cb(null, newUser);
	}
};

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(new LocalStrategy(function(userName, password, done) {
    process.nextTick(function () {
      findByUserName(userName, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false, { message: 'Unknown user ' + username });}

        return done(null, user);
      })
    });
  }
));

var signalR = SignalRJS();
signalR.hub('chatHub',{
	broadcast : function(fromUserName,message){
		this.clients.all.invoke('broadcast').withArgs([fromUserName,message])
		console.log('broadcasting:'+message);
	},
	privateSend : function(fromUserName,toUserName,message){
		this.clients.user(toUserName).invoke('onPrivateMessage').withArgs([fromUserName,message])
		console.log('privateSend from('+fromUserName+') to('+toUserName+') message:'+message);
	}
});

var server = express();
server.use(morgan('dev'));
server.use(cookieParser());
server.use(bodyParser());
server.use(session({ secret: 'stuff' }));
server.use(passport.initialize());
server.use(passport.session());
//server.use(server.router);
server.use(express.static(__dirname));
server.post('/login',passport.authenticate('local', { failureRedirect: '/index.html'}),
  function(req, res) {
      res.redirect('/chat.html');
});
server.get('/identity', 
		function (req, res, next) {
		  if (req.isAuthenticated()){ 
		  	return next(); 
		  }
		  res.redirect('/index.html');
		},
		function(req, res) {
			res.writeHead(200, {"Content-Type": "application/json"});
			res.write(JSON.stringify(req.user));
			res.end();
		});
server.use(signalR.createListener())
server.listen(3000);
signalR.on('CONNECTED',function(){
	console.log('connected');
});

