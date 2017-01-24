'use strict';

var messageFactory = require('../common/messageFactory');

var webSocketTransport = {
    connect: function (connection) {
        connection.send(messageFactory.connectionResponse())
    },
    send: function (connection, messageData) {
        connection.send(messageFactory.message(messageData))
    }
};

module.exports = webSocketTransport;