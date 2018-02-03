const test = require('tap').test;
const Hapi = require('hapi');
const boom = require('boom');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

test('logs errors responses', async (t) => {
  const server = new Hapi.Server({
    debug: {
      request: ['error']
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
    t.deepEqual(tags, { 'detailed-response': true, 'user-error': true }, 'returns the right tags');
    t.deepEqual(Object.keys(event.data), ['id', 'referrer', 'browser', 'userAgent', 'ip', 'method', 'path', 'query', 'statusCode', 'error'], 'includes data about the request');
    t.equal(event.data.error.message, 'bad bad bad');
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
      request: ['error']
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
      request: ['error']
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
    await server.stop();
    t.end();
  });
  const response = await server.inject({ url: '/redirect' });
  t.equal(response.statusCode, 302);
});

test('logs not-found errors', async (t) => {
  const server = new Hapi.Server({
    debug: {
      request: ['error']
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
      return h.response('/breaking').code(404);
    }
  });
  server.events.on('log', async (event, tags) => {
    t.equal(tags['not-found'], true);
    await server.stop();
    t.end();
  });
  await server.start();
  const response = await server.inject({ url: '/breaking' });
  t.equal(response.statusCode, 404);
});

test('does not log not-found errors as user-errors', async (t) => {
  const server = new Hapi.Server({
    debug: {
      request: ['error']
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
      request: ['error']
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
      request: ['error']
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
  server.events.on('log', async (event, tags) => {
    t.equal(tags['server-error'], true);
    await server.stop();
    t.end();
  });
  await server.start();
  const response = await server.inject({ url: '/breaking' });
  t.equal(response.statusCode, 500);
});

test('does not interfere with routes', async (t) => {
  const server = new Hapi.Server({
    debug: {
      request: ['error']
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

test('passes custom error data', async (t) => {
  const server = new Hapi.Server({
    debug: {
      request: ['error']
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
      request: ['error']
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
      request: ['error']
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
    t.deepEqual(Object.keys(event.data), ['id', 'referrer', 'browser', 'userAgent', 'ip', 'method', 'path', 'query', 'statusCode'], 'includes data about the request');
    await server.stop();
    t.end();
  });
  await server.start();
  await server.inject({ url: '/justYourAverageRoute' });
  await wait(500);
});
