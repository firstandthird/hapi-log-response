const Hoek = require('hoek');
const useragent = require('useragent');
const isBot = require('isbot');

const defaults = {
  // some server errors emit two request events,
  // by default make sure we only respond to the one with 'handler':
  requiredTags: [],
  excludeStatus: [],
  includeId: false,
  tags: ['detailed-response']
};

const contains = (arr1, arr2) => arr1.some(item => arr2.includes(item));

const register = (server, options) => {
  options = Hoek.applyToDefaults(defaults, options);

  const getLogData = (request, statusCode) => {
    const logData = {
      referrer: request.info.referrer,
      browser: useragent.parse(request.headers['user-agent']).toString(),
      userAgent: request.headers['user-agent'],
      isBot: isBot(request.headers['user-agent']),
      ip: request.info.remoteAddress,
      method: request.method,
      path: request.path,
      query: Object.assign({}, request.query),
      statusCode,
    };
    if (options.includeId) {
      logData.id = request.info.id;
    }
    return logData;
  };
  // log HTTP 301/302 redirects and 404's here:
  server.events.on({ name: 'response' }, (request) => {
    // individual routes can disable response logging:
    if (request.route.settings.plugins['hapi-log-response'] && request.route.settings.plugins['hapi-log-response'].enabled === false) {
      return;
    }
    // if the client closed the connection then response will be null:
    if (!request.response) {
      return;
    }
    const statusCode = request.response ? request.response.statusCode : 500;
    // exit immediately if not logging anything for this response:
    if (![301, 302, 404].includes(statusCode) || options.excludeStatus.includes(statusCode)) {
      return;
    }

    const tags = [].concat(options.tags);
    const data = getLogData(request, statusCode);
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
      // ignore if required tags were specified, but none of them match any of the event tags:
      const tagArray = Array.isArray(event.tags) ? event.tags : Object.keys(event.tags);
      if (options.requiredTags.length > 0 && !contains(options.requiredTags, tagArray)) {
        return;
      }
      const statusCode = event.error.output.statusCode;
      // skip 404's, they are covered by the response handler:
      if (statusCode === 404) {
        return;
      }
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
      const data = getLogData(request, statusCode);
      // if it is a wreck response it includes the entire response object, which is too big:
      if (event && event.error && event.error.data && event.error.data.isResponseError) {
        event.error.data = {
          path: event.error.data.res.req.path,
          method: event.error.data.res.req.method,
          statusCode: event.error.data.res.statusCode,
          statusMessage: event.error.data.res.statusMessage
        };
      }
      if (event && event.error) {
        data.error = {
          message: event.error.message,
          stack: event.error.stack,
          data: event.error.data,
          output: event.error.output
        };
      }
      server.log(tags, data);
    }
  });

  // options.request will register a handler that logs a response for every route:
  if (options.requests) {
    server.events.on({ name: 'response' }, (request) => {
      // individual routes can disable response logging:
      if (request.route.settings.plugins['hapi-log-response'] && request.route.settings.plugins['hapi-log-response'].enabled === false) {
        return;
      }
      server.log([].concat(options.tags), getLogData(request));
    });
  }
};

exports.plugin = {
  register,
  once: true,
  pkg: require('./package.json')
};
