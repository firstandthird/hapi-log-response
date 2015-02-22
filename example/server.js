var Good = require('good');
var Hapi = require('hapi');
var Handlebars = require('handlebars');
var Boom = require('boom');

var server = new Hapi.Server({
  debug: {
    request: ['error']
  }
});
server.connection({
  port: 8080
});

var goodOptions = {
  reporters: [{
      reporter: require('good-console'),
      args: [{
        //ops: '*',
        response: '*',
        log: '*',
        error: '*'
      }]
    }
  ]
};

server.register([
  { register: Good, options: goodOptions },
  { register: require('../'), options: {
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
         reply(Boom.badRequest('bad bad bad'));
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
