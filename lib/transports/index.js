'use strict'

var transportTypes = require('./transportTypes')

exports[transportTypes.webSockets] = require('./wsTransport')
exports[transportTypes.longPolling] = require('./longPollingTransport')
exports[transportTypes.serverSentEvents] = require('./sseTransport')
