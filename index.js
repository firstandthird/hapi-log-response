const Hoek = require('hoek');
const useragent = require('useragent');

const defaults = {
  excludeStatus: [200, 204, 304],
  tags: ['detailed-response']
};

const register = (server, options) => {
  options = Hoek.applyToDefaults(defaults, options);

  // log HTTP 301/302 redirects and 404's here:
  server.events.on({ name: 'response' }, (request) => {
    // individual routes can disable response logging:
    if (request.route.settings.plugins['hapi-log-response'] && request.route.settings.plugins['hapi-log-response'].enabled === false) {
      return;
    }
    const statusCode = request.response.statusCode;
    // exit immediately if not logging anything for this response:
    if (![301, 302, 404].includes(statusCode) || options.excludeStatus.includes(statusCode)) {
      return;
    }

    const tags = [].concat(options.tags);
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
      pid: process.pid,
    };
    if ([301, 302].includes(statusCode)) {
      tags.push('redirect');
      data.redirectTo = request.response.headers.location;
    } else {
      // everything else is a 404:
      tags.push('not-found');
    }
    server.log(tags, data);
  });

  // log HTTP errors 400-500 here:
  server.events.on({ name: 'request' }, (request, event, eventTags) => {
    // individual routes can disable response logging:
    if (request.route.settings.plugins['hapi-log-response'] && request.route.settings.plugins['hapi-log-response'].enabled === false) {
      return;
    }
    if (event.error && event.error.output) {
      // some server errors emit two request events, make sure we are responding to only one:
      if (!event.tags.includes('handler')) {
        return;
      }
      const statusCode = event.error.output.statusCode;
      // ignore excluded statuses:
      if (options.excludeStatus.includes(statusCode)) {
        return;
      }
      const tags = [].concat(options.tags);
      if (statusCode >= 400 && statusCode < 500) {
        tags.push('user-error');
      } else if (statusCode >= 500) {
        tags.push('server-error');
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
        pid: process.pid,
      };
      if (event && event.error) {
        data.error = event.error;
      }
      server.log(tags, data);
    }
  });
};

exports.plugin = {
  register,
  once: true,
  pkg: require('./package.json')
};
