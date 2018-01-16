'use strict';
const Hoek = require('hoek');
const useragent = require('useragent');

const defaults = {
  excludeStatus: [200, 204, 304],
  excludeResponse: [404],
  tags: ['detailed-response']
};

exports.register = function(server, options, next) {
  options = Hoek.applyToDefaults(defaults, options);

  server.ext('onPreResponse', (request, reply) => {
    reply.continue();
    const response = request.response;
    if (!response) {
      return;
    }
    if (request.route.settings.plugins['hapi-log-response'] && request.route.settings.plugins['hapi-log-response'].enabled === false) {
      return;
    }

    const statusCode = response.output ? response.output.statusCode : response.statusCode;
    if (options.excludeStatus.indexOf(statusCode) !== -1) {
      return;
    }
    const data = {
      timestamp: request.info.received,
      id: request.id,
      referrer: request.info.referrer,
      browser: useragent.parse(request.headers['user-agent']).toString(),
      userAgent: request.headers['user-agent'],
      ip: request.info.remoteAddress,
      instance: request.server.info.uri,
      labels: request.server.settings.labels,
      method: request.method,
      path: request.path,
      query: Object.assign({}, request.query),
      statusCode,
      pid: process.pid
    };
    data.requestPayload = request.payload;
    
    if (response._error && response._error.data) {
      data.errorData = response._error.data;
    }

    if (options.excludeResponse.indexOf(statusCode) === -1) {
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
    if ([301, 302].indexOf(statusCode) > -1) {
      tags.push('redirect');
      data.redirectTo = response.headers.location;
    } else if (statusCode === 404) {
      tags.push('not-found');
    } else if (statusCode >= 400 && statusCode < 500) {
      tags.push('user-error');
    } else if (statusCode >= 500) {
      tags.push('server-error');
    }
    server.log(tags, data);
    return;
  });
  next();
};

exports.register.attributes = {
  name: 'hapi-log-response',
  pkg: require('./package.json')
};
