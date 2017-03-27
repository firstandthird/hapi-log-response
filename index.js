'use strict';
const Hoek = require('hoek');

const defaults = {
  excludeStatus: [200, 304],
  tags: ['detailed-response']
};

exports.register = function(server, options, next) {
  options = Hoek.applyToDefaults(defaults, options);

  server.on('tail', (request) => {
    const response = request.response;

    if (options.excludeStatus.indexOf(response.statusCode) !== -1) {
      return;
    }

    const data = {
      timestamp: request.info.received,
      id: request.id,
      instance: request.server.info.uri,
      labels: request.server.settings.labels,
      method: request.method,
      path: request.path,
      query: Object.assign({}, request.query),
      statusCode: response.statusCode,
      pid: process.pid
    };
    
    data.requestPayload = request.payload;

    if (response.source && response.source.template) {
      data.response = {
        template: response.source.template,
        context: response.source.context
      };
    } else {
      data.response = response.source;
    }
    
    server.log(options.tags, data);
  });
  next();
};

exports.register.attributes = {
  name: 'hapi-log-response',
  pkg: require('./package.json')
};
