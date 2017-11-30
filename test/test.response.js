const test = require('tap').test;
const Hapi = require('hapi');
const boom = require('boom');
const Handlebars = require('handlebars');

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
    await server.stop();
    t.end();
  });
  await server.start();
  const response = await server.inject({ url: '/error' });
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
  const response = await server.inject({ url: '/disabled' });
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
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
    t.equal(tags.redirect, true);
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

test('logs user errors responses', async (t) => {
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
  server.events.on('log', async (event, tags) => {
    t.equal(tags['user-error'], true);
    await server.stop();
    t.end();
  });
  await server.start();
  const response = await server.inject({ url: '/user' });
  t.equal(response.statusCode, 401);
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
        return h.response('').code(500);
      }
    },
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
