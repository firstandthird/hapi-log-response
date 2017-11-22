const test = require('tap').test;
const Hapi = require('hapi');

test('handles log responses', async (t) => {
  const server = new Hapi.Server({
    debug: {
      request: ['error']
    },
    port: 8080
  });
  await server.register([
    { plugin: require('vision') },
    // { plugin: require('hapi-logr'),
    //   options: {
    //     reporters: {
    //       console: {
    //         reporter: require('logr-console-color')
    //       }
    //     }
    //   }
    // },
    { plugin: require('../'),
      options: {
      }
    }
  ]);
  t.end();

  // console.log('----')
  // console.log('----')
  // console.log('----')
  // server.views({
  //   engines: {
  //     html: Handlebars
  //   },
  //   path: `${__dirname}/views`
  // });
  //
  // server.route([
  //   {
  //     method: 'GET',
  //     path: '/error',
  //     handler(request, h) {
  //       throw Boom.badRequest('bad bad bad');
  //     }
  //   },
  //   {
  //     method: 'GET',
  //     path: '/ok',
  //     handler(request, h) {
  //       return 'ok';
  //     }
  //   },
  //   {
  //     method: 'GET',
  //     path: '/disabled',
  //     config: {
  //       plugins: {
  //         'hapi-log-response': {
  //           enabled: false
  //         }
  //       }
  //     },
  //     handler(request, h) {
  //       throw Boom.badRequest('bad bad bad (disabled logging)');
  //     }
  //   },
  //   {
  //     method: 'GET',
  //     path: '/view',
  //     handler(request, h) {
  //       return h.view('view', {
  //         test: 123
  //       }).code(401);
  //     }
  //   },
  //   {
  //     method: 'GET',
  //     path: '/breaking',
  //     handler(request, h) {
  //       return h.view('').code(500);
  //     }
  //   },
  //   {
  //     method: 'GET',
  //     path: '/redirect',
  //     handler(request, h) {
  //       return h.redirect('/');
  //     }
  //   }
  // ]);
  // await server.start();
  // console.log('starting')
  // server.log(['log', 'server'], `Hapi server started ${server.info.uri}`);
});
