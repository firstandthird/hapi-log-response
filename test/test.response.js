const test = require('tap').test;
const Hapi = require('hapi');
const boom = require('boom');
const wreck = require('wreck');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

test('logs errors responses', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('../'),
      options: {
      }
    }
  ]);
  server.route({
    method: 'GET',
    path: '/error',
    handler(request, h) {
      throw boom.badRequest('bad bad bad');
    }
  });
  server.events.on('log', async (event, tags) => {
    t.deepEqual(tags, { 'detailed-response': true, 'user-error': true, 'bad-request': true }, 'returns the right tags');
    t.deepEqual(Object.keys(event.data), ['browser', 'userAgent', 'isBot', 'ip', 'method', 'path', 'query', 'message', 'statusCode', 'error'], 'includes data about the request');
    t.equal(event.data.message, '/error: bad bad bad');
    t.equal(event.data.error.message, 'bad bad bad');
    t.equal(event.data.error.stack.startsWith('Error: bad bad bad'), true);
    t.deepEqual(event.data.error.output, {
      statusCode: 400,
      payload: { statusCode: 400, error: 'Bad Request', message: 'bad bad bad' },
      headers: {}
    });
    t.deepEqual(Object.keys(event.data.error), ['message', 'stack', 'data', 'output']);
    await server.stop();
  });
  await server.start();
  await server.inject({ url: '/error' });
  await wait(600);
  t.end();
});

test('logs errors responses, option to include hapi tags', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('../'),
      options: {
        includeEventTags: true
      }
    }
  ]);
  server.route({
    method: 'GET',
    path: '/error',
    handler(request, h) {
      throw boom.badRequest('bad bad bad');
    }
  });
  server.events.on('log', async (event, tags) => {
    t.deepEqual(tags, { 'detailed-response': true, handler: true, 'user-error': true, 'bad-request': true }, 'returns the right tags');
    t.deepEqual(Object.keys(event.data), ['browser', 'userAgent', 'isBot', 'ip', 'method', 'path', 'query', 'message', 'statusCode', 'error'], 'includes data about the request');
    t.equal(event.data.error.message, 'bad bad bad');
    t.equal(event.data.message, '/error: bad bad bad');
    t.equal(event.data.error.stack.startsWith('Error: bad bad bad'), true);
    t.deepEqual(event.data.error.output, {
      statusCode: 400,
      payload: { statusCode: 400, error: 'Bad Request', message: 'bad bad bad' },
      headers: {}
    });
    t.deepEqual(Object.keys(event.data.error), ['message', 'stack', 'data', 'output']);
    await server.stop();
    t.end();
  });
  await server.start();
  await server.inject({ url: '/error' });
});

test('individual routes can disable plugin', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('../'),
      options: {
      }
    }
  ]);
  server.route({
    method: 'GET',
    path: '/disabled',
    config: {
      plugins: {
        'hapi-log-response': {
          enabled: false
        }
      }
    },
    handler(request, h) {
      throw boom.badRequest('bad bad bad (disabled logging)');
    }
  });
  server.events.on('log', async (event, tags) => {
    await server.stop();
    t.fail();
  });
  await server.start();
  await server.inject({ url: '/disabled' });
  await wait(2000);
  await server.stop();
  t.end();
});

test('logs redirects', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('../'),
      options: {
      }
    }
  ]);
  server.route([
    {
      method: 'GET',
      path: '/ok',
      handler(request, h) {
        return 'ok';
      }
    },
    {
      method: 'GET',
      path: '/redirect',
      handler(request, h) {
        return h.redirect('/ok');
      }
    }
  ]);
  await server.start();
  server.events.on('log', async (event, tags) => {
    t.deepEqual(tags, { 'detailed-response': true, redirect: true });
    t.equal(event.data.message, '/redirect: HTTP 302 Redirect to /ok');
    await server.stop();
    t.end();
  });
  const response = await server.inject({ url: '/redirect' });
  t.equal(response.statusCode, 302);
});

test('logs ambiguous not-found responses', async (t) => {
  t.plan(4);
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('vision') },
    { plugin: require('../'),
      options: {
      }
    }
  ]);
  server.route({
    method: 'get',
    path: '/breaking/{param}',
    handler(request, h) {
      return h.response('/breaking').code(404);
    }
  });
  let logCount = 0;
  server.events.on('log', (event, tags) => {
    logCount += 1;
    t.equal(tags['not-found'], true);
    t.equal(event.data.message, '/breaking/{param}: GET /breaking/ambiguously 404');
  });
  await server.start();
  const response = await server.inject({ url: '/breaking/ambiguously' });
  t.equal(response.statusCode, 404);
  t.equal(logCount, 1);
  await server.stop();
});

test('logs not-found errors', async (t) => {
  t.plan(5);
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('vision') },
    { plugin: require('../'),
      options: {
      }
    }
  ]);
  server.route({
    method: 'get',
    path: '/breaking/{param}',
    handler(request, h) {
      throw boom.notFound('Page not found', { params: request.params, test: 'fuddy duddy' });
    }
  });
  let logCount = 0;
  server.events.on('log', (event, tags) => {
    logCount += 1;
    t.equal(tags['not-found'], true);
    t.equal(event.data.message, '/breaking/{param}: Page not found');
    t.equal(event.data.error.data.test, 'fuddy duddy');
  });
  await server.start();
  const response = await server.inject({ url: '/breaking/ambiguously' });
  t.equal(response.statusCode, 404);
  t.equal(logCount, 1);
  await server.stop();
});


test('logs client timeout  errors', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('vision') },
    { plugin: require('../'),
      options: {
      }
    }
  ]);
  server.route({
    method: 'get',
    path: '/breaking',
    handler(request, h) {
      throw boom.gatewayTimeout('timeout!');
    }
  });
  server.events.on('log', async (event, tags) => {
    t.equal(tags['client-timeout'], true);
    t.equal(event.data.message, '/breaking: timeout!');
    await server.stop();
    t.end();
  });
  await server.start();
  const response = await server.inject({ url: '/breaking' });
  t.equal(response.statusCode, 504);
});

test('logs service unavailable errors', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('vision') },
    { plugin: require('../'),
      options: {
      }
    }
  ]);
  server.route({
    method: 'get',
    path: '/breaking',
    handler(request, h) {
      throw boom.serverUnavailable('unavailable!');
    }
  });
  server.events.on('log', async (event, tags) => {
    t.equal(tags['service-unavailable'], true);
    t.equal(event.data.message, '/breaking: unavailable!');
    await server.stop();
    t.end();
  });
  await server.start();
  const response = await server.inject({ url: '/breaking' });
  t.equal(response.statusCode, 503);
});

test('logs bad request errors', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('vision') },
    { plugin: require('../'),
      options: {
      }
    }
  ]);
  server.route({
    method: 'get',
    path: '/breaking',
    handler(request, h) {
      throw boom.badRequest('bad!');
    }
  });
  server.events.on('log', async (event, tags) => {
    t.equal(tags['bad-request'], true);
    t.equal(event.data.message, '/breaking: bad!');
    await server.stop();
    t.end();
  });
  await server.start();
  const response = await server.inject({ url: '/breaking' });
  t.equal(response.statusCode, 400);
});

test('logs unauthorized tag', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('vision') },
    { plugin: require('../'),
      options: {
      }
    }
  ]);
  server.route({
    method: 'get',
    path: '/breaking',
    handler(request, h) {
      throw boom.unauthorized('unauthorized!');
    }
  });
  server.events.on('log', async (event, tags) => {
    t.equal(tags.unauthorized, true);
    t.equal(event.data.message, '/breaking: unauthorized!');
    await server.stop();
    t.end();
  });
  await server.start();
  const response = await server.inject({ url: '/breaking' });
  t.equal(response.statusCode, 401);
});

test('logs internal-server tag', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('vision') },
    { plugin: require('../'),
      options: {
      }
    }
  ]);
  server.route({
    method: 'get',
    path: '/breaking',
    handler(request, h) {
      throw new Error('error!');
    }
  });
  let called = false;
  server.events.on('log', async (event, tags) => {
    if (called) {
      return;
    }
    called = true;
    t.equal(tags['internal-server'], true);
    t.equal(event.data.message, '/breaking: error!');
    await server.stop();
    t.end();
  });
  await server.start();
  const response = await server.inject({ url: '/breaking' });
  t.equal(response.statusCode, 500);
});

test('does not log not-found errors as user-errors', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('vision') },
    { plugin: require('../'),
      options: {
      }
    }
  ]);
  let logCount = 0;
  server.events.on('log', (event, tags) => {
    t.equal(tags['user-error'], undefined);
    logCount++;
  });
  await server.start();
  const response = await server.inject({ url: '/breaking' });
  await wait(500);
  t.equal(response.statusCode, 404);
  t.equal(logCount, 1);
  await server.stop();
  t.end();
});

test('does not log user errors responses', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('../'),
      options: {
      }
    }
  ]);
  server.route([
    {
      method: 'GET',
      path: '/user',
      handler(request, h) {
        return h.response('user').code(401);
      }
    }
  ]);
  server.events.on('log', (event, tags) => t.fail());
  await server.start();
  const response = await server.inject({ url: '/user' });
  t.equal(response.statusCode, 401);
  // wait for event to be processed:
  await wait(2000);
  await server.stop();
  t.end();
});

test('logs server errors', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('../'),
      options: {
      }
    }
  ]);
  server.route([
    {
      method: 'GET',
      path: '/breaking',
      handler(request, h) {
        const a = {};
        a.b.c = 1234;
      }
    }
  ]);
  let seen = false;
  server.events.on('log', (event, tags) => {
    t.equal(tags['server-error'], true);
    seen = true;
  });
  await server.start();
  const response = await server.inject({ url: '/breaking' });
  t.equal(response.statusCode, 500);
  await wait(500);
  t.equal(seen, true);
  await server.stop();
  t.end();
});

test('does not interfere with routes', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('../'),
      options: {
      }
    }
  ]);
  server.route([
    {
      method: 'GET',
      path: '/hello',
      handler(request, h) {
        return 'hello';
      }
    },
  ]);
  await server.start();
  const response = await server.inject({ url: '/hello' });
  t.equal(response.statusCode, 200);
  await server.stop();
  t.end();
});

test('does not log when client closes the connection', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('../'),
      options: {
      }
    }
  ]);
  server.events.on('log', (event, tags) => t.fail());
  await server.start();
  // simulate a client closed response event:
  server.events.emit('response', {
    response: null,
    route: { settings: { plugins: {} } }
  });
  await wait(300);
  await server.stop();
  t.end();
});

test('passes custom error data', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('../'),
      options: {
      }
    }
  ]);
  server.route({
    method: 'GET',
    path: '/error',
    handler(request, h) {
      throw boom.badRequest('bad bad bad', { test: 1, pizza: 'pie' });
    }
  });
  await server.start();

  server.ext('onPreResponse', (request, h) => {
    const response = request.response;

    t.equal(response.isBoom, true);
    t.equal(response.data.test, 1);
    t.equal(response.data.pizza, 'pie');

    return h.continue;
  });

  await server.inject({ url: '/error' });
  await server.stop();
  t.end();
});

test('options.excludeStatus', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('../'),
      options: {
        excludeStatus: [301, 302, 400]
      }
    }
  ]);
  server.route({
    method: 'GET',
    path: '/error',
    handler(request, h) {
      throw boom.badRequest('bad bad bad');
    }
  });
  server.route({
    method: 'GET',
    path: '/redirect',
    handler(request, h) {
      return h.redirect('/ok');
    }
  });
  server.events.on('log', (event, tags) => {
    t.fail();
  });
  await server.start();
  await server.inject({ url: '/error' });
  await server.inject({ url: '/redirect' });
  await wait(2000);
  await server.stop();
  t.end();
});

test('options.requests logs a response for every request', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('../'),
      options: {
        requests: true
      }
    }
  ]);
  server.route({
    method: 'GET',
    path: '/justYourAverageRoute',
    handler(request, h) {
      return 'everything is fine';
    }
  });
  server.events.on('log', async (event, tags) => {
    t.deepEqual(tags, { 'detailed-response': true }, 'returns the right tags');
    t.deepEqual(Object.keys(event.data), ['browser', 'userAgent', 'isBot', 'ip', 'method', 'path', 'query', 'message', 'statusCode', 'responseTime'], 'includes data about the request');
    await server.stop();
    t.end();
  });
  await server.start();
  await server.inject({ url: '/justYourAverageRoute' });
  await wait(500);
});

test('options.includeId will also include the request id', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('../'),
      options: {
        includeId: true,
        requests: true
      }
    }
  ]);
  server.route({
    method: 'GET',
    path: '/justYourAverageRoute',
    handler(request, h) {
      return 'everything is fine';
    }
  });
  server.events.on('log', async (event, tags) => {
    t.deepEqual(tags, { 'detailed-response': true }, 'returns the right tags');
    t.deepEqual(Object.keys(event.data), ['browser', 'userAgent', 'isBot', 'ip', 'method', 'path', 'query', 'message', 'statusCode', 'id', 'responseTime'], 'includes data about the request');
    await server.stop();
    t.end();
  });
  await server.start();
  await server.inject({ url: '/justYourAverageRoute' });
  await wait(500);
});

test('options.requiredTags controls what tags will trigger a log', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('../'),
      options: {
        requiredTags: ['internal'], // this will not log the handler error
      }
    }
  ]);
  server.route([
    {
      method: 'GET',
      path: '/breaking',
      handler(request, h) {
        const a = {};
        a.b.c = 1234;
      }
    }
  ]);
  server.events.on('log', (event, tags) => {
    t.notEqual(tags.handler, true);
  });
  await server.start();
  const response = await server.inject({ url: '/breaking' });
  t.equal(response.statusCode, 500);
  await wait(500);
  await server.stop();
  t.end();
});

test('options.requiredTags just logs everything if set to empty', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('../'),
      options: {
        requiredTags: [], // this will log all server errors, not just the handler errors
      }
    }
  ]);
  server.route([
    {
      method: 'GET',
      path: '/breaking',
      handler(request, h) {
        const a = {};
        a.b.c = 1234;
      }
    }
  ]);
  let called = 0;
  server.events.on('log', (event, tags) => {
    called++;
  });
  await server.start();
  const response = await server.inject({ url: '/breaking' });
  t.equal(response.statusCode, 500);
  await wait(500);
  t.equal(called, 2, 'sends out both handler and server log messages');
  await server.stop();
  t.end();
});

test('huge wreck errors are truncated', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('../'),
      options: {
      }
    }
  ]);
  server.route({
    method: 'GET',
    path: '/badRequest',
    handler(request, h) {
      throw boom.badRequest('bad request');
    }
  });
  server.route({
    method: 'GET',
    path: '/error',
    async handler(request, h) {
      await wreck.get('http://localhost:8080/badRequest');
    }
  });
  const responses = [];
  server.events.on('log', async (event, tags) => {
    responses.push(event.data.error.data);
    await server.stop();
  });
  await server.start();
  await server.inject({ method: 'get', url: '/error' });
  t.match(responses[1], {
    path: '/badRequest',
    method: 'GET',
    statusCode: 400,
    statusMessage: 'Bad Request'
  });
  t.end();
});

test('options.ignoreUnauthorizedTry', async (t) => {
  const server = new Hapi.Server({
    debug: {
      request: ['user-error']
    },
    port: 8080
  });
  const scheme = function () {
    return {
      authenticate(request, h) {
        return boom.unauthorized();
        // failure statements like this one won't work however as the 'try' tag won't be present:
        // return h.unauthenticated(boom.unauthorized(null, 'cookie'));
      }
    };
  };
  server.auth.scheme('custom', scheme);
  server.auth.strategy('microauth', 'custom');
  await server.register(
    {
      plugin: require('../'),
      options: {
        ignoreUnauthorizedTry: true
      }
    }
  );
  server.route({
    method: 'GET',
    path: '/strategery',
    config: {
      auth: {
        strategy: 'microauth',
        mode: 'try'
      }
    },
    handler(request, h) {
      return '/ok';
    }
  });
  server.route({
    method: 'GET',
    path: '/noStrategery',
    config: {
      auth: {
        strategy: 'microauth',
      }
    },
    handler(request, h) {
      return '/ok';
    }
  });

  let count = 0;
  server.events.on('log', (event, tags) => {
    t.notOk(tags.try, 'authentication failure does not log if "try" tag included');
    count++;
  });
  await server.start();
  const first = await server.inject({ url: '/strategery' });
  t.equal(first.statusCode, 200, 'try strategy returns OK even if failed to auth');
  await server.inject({ url: '/noStrategery' });
  await wait(2000);
  t.equal(count, 1, 'only logs when mode is not "try"');
  await server.stop();
  t.end();
});

test('options.requests logs a response time for requests', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('../'),
      options: {
        requests: true
      }
    }
  ]);
  server.route({
    method: 'GET',
    path: '/justYourAverageRoute',
    async handler(request, h) {
      await wait(1001);
      return 'everything is fine';
    }
  });
  server.events.on('log', async (event, tags) => {
    t.ok(event.data.responseTime > 1000);
    await server.stop();
    t.end();
  });
  await server.start();
  await server.inject({ url: '/justYourAverageRoute' });
  await wait(500);
});

test('options.requestPayload will also include the request payload', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('../'),
      options: {
        requestPayload: true,
        requests: true
      }
    }
  ]);
  server.route({
    method: 'POST',
    path: '/justYourAverageRoute',
    handler(request, h) {
      return 'everything is fine';
    }
  });
  server.events.on('log', async (event, tags) => {
    t.deepEqual(tags, { 'detailed-response': true }, 'returns the right tags');
    t.equal(typeof event.data.requestPayload, 'object');
    t.equal(event.data.requestPayload.val1, 'one');
    await server.stop();
    t.end();
  });
  await server.start();
  await server.inject({ method: 'POST', url: '/justYourAverageRoute', payload: { val1: 'one' } });
  await wait(500);
});

test('options.requestHeaders will also include the request payload', async (t) => {
  const server = new Hapi.Server({
    debug: {
      //request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('../'),
      options: {
        requestHeaders: true,
        requests: true
      }
    }
  ]);
  server.route({
    method: 'POST',
    path: '/justYourAverageRoute',
    handler(request, h) {
      return 'everything is fine';
    }
  });
  server.events.on('log', async (event, tags) => {
    t.deepEqual(tags, { 'detailed-response': true }, 'returns the right tags');
    t.equal(typeof event.data.requestHeaders, 'object');
    t.deepEqual(Object.keys(event.data.requestHeaders), ['user-agent', 'host', 'content-type', 'content-length']);
    await server.stop();
    t.end();
  });
  await server.start();
  await server.inject({ method: 'POST', url: '/justYourAverageRoute', payload: { val1: 'one' } });
  await wait(500);
});

test('joi validation errors do not call request or log', async (t) => {
  const server = new Hapi.Server({
    debug: {
    },
    port: 8080
  });
  await server.register([
    { plugin: require('../'),
      options: {
        requestPayload: true,
        requests: true,
      }
    }
  ]);
  const joi = require('joi');
  server.route({
    method: 'GET',
    path: '/justYourAverageRoute',
    config: {
      validate: {
        query: {
          value: joi.number()
        }
      }
    },
    handler(request, h) {
      return 'everything is fine';
    }
  });
  const oldLog = console.log;
  const results = [];
  console.log = (input) => {
    results.push(input);
  };
  server.events.on({ name: 'request' }, (request) => {
    t.fail();
  });
  await server.start();
  await server.inject({ url: '/justYourAverageRoute?notValue=wrong' });
  await wait(1500);
  await server.stop();
  console.log = oldLog;
  t.equal(results.length, 0);
  t.end();
});
