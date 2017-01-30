'use strict';

var util = require('util');
var events = require('events');
var uuid = require('node-uuid');
var WSServer = require('ws').Server;
var url = require('url');
var Router = require('express').Router;
var hubs = require('./hubs/hubs');
var bodyParser = require('body-parser');
var EVENT_CONSTANTS = require('./common/eventConstants');
var ConnectionManager = require('./connections/connectionManager');
var signalrRequestParser = require('./common/signalrRequestParser');
var transports = require('./transports');
var serverProperties = require('./serverProperties.json');

var SIGNAL_R_WEB_METHODS = [
    'poll',
    'send',
    'user',
    'ping',
    'start',
    'abort',
    'connect',
    'negotiate',
    'reconnect',
    'hubs'
]

function isValidSignalRWebMethod(name) {
    return SIGNAL_R_WEB_METHODS.indexOf(name) > -1
}

function SignalRJS() {
    if (!(this instanceof SignalRJS)) {
        return new SignalRJS();
    }

    this._connectionManager = new ConnectionManager();
    this.heartBeat(serverProperties.HeartBeatInterval);
}

util.inherits(SignalRJS, events.EventEmitter);

SignalRJS.prototype = util._extend(SignalRJS.prototype, {
    start: function (req, res) {
        res.send({"Response": "started"});
        this.emit(EVENT_CONSTANTS.connected);
    },

    connect: function (req, res) {
        var user = req.signalrjs.user;
        var token = req.signalrjs.token;
        var transportType = req.signalrjs.transportType;

        if (!transports[transportType]) {
            return res.send();
        }

        transports[transportType].connect(res);
        this._connectionManager.put(user, token, transportType, res);
    },

    reconnect: function (req, res) {
        var token = req.signalrjs.token;
        var transportType = req.signalrjs.transportType;

        var connection = this._connectionManager.getByToken(token);

        if (!connection) {
            this._connectionManager.put(null, token, transportType, res);
        } else {
            this._connectionManager.updateConnection(token, res);
        }

        var transport = transports[transportType];
        if (transport) {
            transport.send(res, []);
        }
    },

    createNewConnectionProperties: function () {
        var connectionProperties = {};
        for (var prop in serverProperties) {
            connectionProperties[prop] = serverProperties[prop];
        }
        connectionProperties.ConnectionId = uuid.v4();
        connectionProperties.ConnectionToken = uuid.v4();
        return connectionProperties;
    },

    negotiate: function (req, res) {
        var connectionProperties = this.createNewConnectionProperties();
        res.send(connectionProperties);
    },

    heartBeat: function (heartBeatInterval) {
        var self = this;
        setInterval(function () {
            self._connectionManager.forEach(function (connection) {
                var transport = transports[connection.type];
                if (transport && transport.sendHeartBeat) {
                    transport.sendHeartBeat(connection.connection);
                }
            });
        }, heartBeatInterval);
    },

    poll: function (req, res) {
        var self = this;
        var token = req.signalrjs.token;
        this._connectionManager.updateConnection(req.signalrjs.token, res);
        setTimeout(function () {
            var connection = self._connectionManager.getByToken(token);
            if (!connection) {
                return;
            }

            var transport = transports[connection.type];
            if (!transport) {
                return;
            }
            transport.send(connection.connection, []);
        }, 30000);
    },

    ping: function (req, res) {
        res.send({"Response": "pong"});
    },

    abort: function (req, res) {
        var token = req.signalrjs.token;
        this._connectionManager.delByToken(token);
        res.send({"Response": "aborted"});
    },

    hub: function (hubName, hubObject) {
        hubs.add(hubName, hubObject);
        return this;
    },

    hubs: function (req, res) {
        hubs.getClientScript(function (clientHubScript) {
            res.writeHead(200, {"Content-Type": "application/javascript"});
            res.write(clientHubScript);
            res.end();
        });
    },

    user: function (req, res) {
        if (!req.signalrjs) {
            return;
        }
        var user = req.signalrjs.user;
        var token = req.signalrjs.token;
        this._connectionManager.setUserToken(user, token);
        res.send({})
    },

    hubRoute: function (req, res) {
        var self = this;
        hubs.parseMessage((req.body && req.body.data), function (responseMsg, toUser) {
            res.end();
            if (toUser) {
                return self.sendToUser(toUser, responseMsg);
            }
            self.broadcast(responseMsg);
        });
    },

    broadcast: function (messageData) {
        this._connectionManager.forEach(function (connection) {
            var transport = transports[connection.type];
            if (transport) {
                transport.send(connection.connection, messageData);
            }
        });
    },

    sendToUser: function (user, messageData) {
        var connection = this._connectionManager.getByUser(user);
        if (!connection) {
            return;
        }
        if (!connection.connection) {
            return;
        }
        var transport = transports[connection.type];
        if (transport) {
            transport.send(connection.connection, messageData);
        }
    },

    send: function (req, res) {
        this.hubRoute(req, res);
    },

    createListener: function () {
        var self = this;

        return Router()
            .use(bodyParser.urlencoded({extended: false}))
            .use(signalrRequestParser())
            .use(serverProperties.Url + '/:method', function (req, res, next) {
                self._executeWebMethod(req, res, next)
            })
    },

    createWsListener: function (server) {
        var self = this;

        var wss = new WSServer({
            server: server
        })

        wss.shouldHandle = function (req) {
            return url.parse(req.url).pathname.startsWith(serverProperties.Url);
        }

        wss.on('connection', function (ws) {
            Object.assign(ws, {
                end: function () {
                    this.send()
                }
            })

            var urlParts = url.parse(ws.upgradeReq.url, true);
            var pathname = urlParts.pathname;
            var query = urlParts.query;

            const req = {
                signalrjs: {
                    user: null,
                    token: query.connectionToken,
                    transportType: query.transport
                }
            }

            if (pathname.indexOf(serverProperties.Url + '/reconnect') === 0) {
                self.reconnect(req, ws)
            } else {
                self.connect(req, ws)
            }

            ws.on('close', function () {
                self._connectionManager.delByToken(query.connectionToken);
            })

            ws.on('message', function (data) {
                self.send({
                    body: {
                        data: data
                    }
                }, ws)
            });


        });
    },

    _executeWebMethod: function (req, res, next) {
        var method = req.params.method

        if (isValidSignalRWebMethod(method)) {
            this[method](req, res);
        } else {
            next()
        }
    }
})

module.exports = SignalRJS;
