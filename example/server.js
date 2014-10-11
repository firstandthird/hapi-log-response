var Good = require('good');
var Hapi = require('hapi');
var Handlebars = require('handlebars');

var server = new Hapi.Server(8080, '0.0.0.0', {
  debug: {
    request: ['error']
  }
});

var goodOptions = {
  reporters: [{
      reporter: Good.GoodConsole,
      args: [{
        events: {
          //ops: '*',
          request: '*',
          log: '*',
          error: '*'
        }
      }]
    }
  ]
};

server.pack.register([
  { plugin: Good, options: goodOptions },
  { plugin: require('../'), options: {
  }}
], function (err) {

   if (err) {
      console.log(err);
      return;
   }


   server.views({
     engines: {
       html: Handlebars
     },
     path: __dirname + '/views'
   });

   server.route([
     {
       method: 'GET', 
       path: '/error', 
       handler: function(request, reply) {
         reply(Hapi.error.badRequest('bad bad bad'));
       }
     },
     { method: 'GET', path: '/', handler: function(request, reply) {
       reply('ok');
     }},
     { method: 'GET', path: '/view', handler: function(request, reply) {
       reply.view('view', {
         test: 123
       }).code(401);
     }}
   ]);

   server.start(function() {
     server.log(['log', 'server'], 'Hapi server started '+ server.info.uri);
   });

});
