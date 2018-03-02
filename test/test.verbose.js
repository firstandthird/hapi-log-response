const test = require('tap').test;
const Hapi = require('hapi');
const boom = require('boom');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

test('verbose mode logs accept-encoding event', async (t) => {
  const server = new Hapi.Server({
    debug: {
      request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('../'),
      options: {
        verbose: true
      }
    }
  ]);
  server.route({
    method: 'GET',
    path: '/error',
    handler(request, h) {
      // simulate an accept-encoding event:
      request._log(['accept-encoding', 'error'], new Error('did not accept'));
    }
  });
  server.events.on('log', async (event, tags) => {
    console.log('+')
    console.log('+')
    console.log('+')
    console.log('+')
    console.log(tags)
    // t.ok(tags['accept-encoding']);
    await server.stop();
    t.end();
  });
  await server.start();
  try {
    await server.inject({ url: '/error' });
  } catch (e) {
  }
});
