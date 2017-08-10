'use strict';
const Hoek = require('hoek');
const useragent = require('useragent');

const defaults = {
  excludeStatus: [200, 304],
  excludeResponse: [404],
  tags: ['detailed-response']
};

exports.register = function(server, options, next) {
  options = Hoek.applyToDefaults(defaults, options);

  server.on('tail', (request) => {
    const response = request.response;
    if (!response) {
      return;
    }

    if (options.excludeStatus.indexOf(response.statusCode) !== -1) {
      return;
    }
    const data = {
      timestamp: request.info.received,
      id: request.id,
      referrer: request.info.referrer,
      userAgent: useragent.parse(request.headers['user-agent']).toString(),
      ip: request.info.remoteAddress,
      instance: request.server.info.uri,
      labels: request.server.settings.labels,
      method: request.method,
      path: request.path,
      query: Object.assign({}, request.query),
      statusCode: response.statusCode,
      pid: process.pid
    };
    data.requestPayload = request.payload;

    if (options.excludeResponse.indexOf(response.statusCode) === -1) {
      if (response.source && response.source.template) {
        data.response = {
          template: response.source.template,
          context: response.source.context
        };
      } else {
        data.response = response.source;
      }
    }
    /*
    301,302 - redirect
    404 - not found
    40x - user-error
    50x - server-error
    */
    const tags = [].concat(options.tags);
    if ([301, 302].indexOf(response.statusCode) > -1) {
      tags.push('redirect');
    } else if (response.statusCode === 404) {
      tags.push('not-found');
    } else if (response.statusCode >= 400 && response.statusCode < 500) {
      tags.push('user-error');
    } else if (response.statusCode >= 500) {
      tags.push('server-error');
    }
    server.log(tags, data);
  });
  next();
};

exports.register.attributes = {
  name: 'hapi-log-response',
  pkg: require('./package.json')
};
