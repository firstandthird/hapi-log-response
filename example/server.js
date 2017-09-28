'use strict';
const Hapi = require('hapi');
const Handlebars = require('handlebars');
const Boom = require('boom');

const server = new Hapi.Server({
  debug: {
    request: ['error']
  }
});
server.connection({
  port: 8080
});

server.register([
  { register: require('vision') },
  {
    register: require('hapi-logr'),
    options: {
      reporters: {
        console: {
          reporter: require('logr-console-color')
        }
      }
    }
  },
  {
    register: require('../'),
    options: {
    }
  }
], (err) => {
  if (err) {
    throw err;
  }


  server.views({
    engines: {
      html: Handlebars
    },
    path: `${__dirname}/views`
  });

  server.route([
    {
      method: 'GET',
      path: '/error',
      handler(request, reply) {
        reply(Boom.badRequest('bad bad bad'));
      }
    },
    {
      method: 'GET',
      path: '/',
      handler(request, reply) {
        reply('ok');
      }
    },
    {
      method: 'GET',
      path: '/view',
      handler(request, reply) {
        reply.view('view', {
          test: 123
        }).code(401);
      }
    },
    {
      method: 'GET',
      path: '/breaking',
      handler(request, reply) {
        reply.view('').code(500);
      }
    },
    {
      method: 'GET',
      path: '/redirect',
      handler(request, reply) {
        reply.redirect('/');
      }
    }

  ]);

  server.start((serverErr) => {
    if (serverErr) {
      throw err;
    }
    server.log(['log', 'server'], `Hapi server started ${server.info.uri}`);
  });
});
