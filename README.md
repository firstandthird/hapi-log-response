<h1 align="center">hapi-log-response</h1>

<p align="center">
  <a href="https://github.com/firstandthird/hapi-log-response/actions">
    <img src="https://img.shields.io/github/workflow/status/firstandthird/hapi-log-response/Test/main?label=Tests&style=for-the-badge" alt="Test Status"/>
  </a>
  <a href="https://github.com/firstandthird/hapi-log-response/actions">
    <img src="https://img.shields.io/github/workflow/status/firstandthird/hapi-log-response/Lint/main?label=Lint&style=for-the-badge" alt="Lint Status"/>
  </a>
  <img src="https://img.shields.io/npm/v/hapi-log-response.svg?label=npm&style=for-the-badge" alt="NPM" />
</p>


A [hapi](https://hapi.dev/) plugin that uses the [server.log()](https://hapi.dev/api/?v=20.1.0#-serverlogtags-data-timestamp) function to log requests/responses based on their statusCode.  By default it will only log redirects (HTTP 301/302) and errors (HTTP 400-500), but you can customize it to include/exclude any status code you want, or just have it log all requests regardless of code.

## Installation

```sh
npm install hapi-log-response
```

_or_

```sh
yarn add hapi-log-response
```

## Usage

Register just like any other hapi plugin:

```javascript
const Hapi = require('@hapi/hapi');
const server = Hapi.server({
  debug: {
    request: ['error']
  },
  port: 8080
});
await server.register({
  plugin: require('hapi-log-response'),
  options: {}
});
```

Now if you have a route like:
```js

```

```js
server.route({
  method: 'GET',
  path: '/error',
  handler(request, h) {
    throw boom.badRequest('HELLO WORLD');
  }
});
```

  Calling that route will result in something like the following log:
  ```
  [ 'detailed-response', 'user-error', 'bad-request' ]
  {
   browser: 'Other 0.0.0 / Other 0.0.0',
   userAgent: 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0',
   isBot: false,
   ip: '127.0.0.1',
   method: 'get',
   path: '/error',
   query: {},
   message: '/error: HELLO WORLD',
   statusCode: 400,
   error: {
     message: 'HELLO WORLD',
     stack: 'Error: HELLO WORLD\n
        at handler (/script.js:26:12)
        ....'
  ```

## Default tags

hapi-log-response will add the following tags to the log depending on the HTTP status of the request:

- _301_ 'redirect'
- _302_ 'redirect'
- _400_ 'bad-request'
- _401_ 'unauthorized'
- _500_ 'internal-server'
- _503_ 'service-unavailable'
- _504_ 'client-timeout'

## Options

You can configure hapi-log-response by configuring the following options when you register the plugin:

- _requests_

   By default hapi-log-responses only responds when the request results in either a redirect (HTTP 301 or 302) or an error (anything between HTTP 400 through HTTP 500).  Set this option to true to always log all requests regardless of HTTP status.  Setting this will override the _excludeStatus_ option.

- _requiredTags_

  An array of tags to match, tags that don't match this will not be logged.

- _excludeStatus_

  An array of HTTP statuses you want to ignore.  Responses that match any of these statusCodes will not be logged.  However the _requests_ option logs everything and will override this if set to true.

- _includeId_

  Will include the hapi-assigned ID for the request, default is false.

- _ignoreUnauthorizedTry_

  By default hapi-log-response will log any time a client tries to access a protected route.  This can get really obnoxious when your server is being probed by the various crawlers and bots running around the Internet, so set this to 'true' to ignore those failed attempts.

- _includeEventTags_

  By default event tags like `handler` are not logged, set this option to true to see them.

- _requestPayload_

  For POST routes, you can opt to also log the incoming request payload.  Default is false.

- _requestHeaders_

  Setting this option to true will cause request headers to be included in the logs.  By default they are not included.

- _tags_

  An array containing zero or more strings that will be used to tag logged responses. If not specified, the default is `['detailed-response']`.


---

<a href="https://firstandthird.com"><img src="https://firstandthird.com/_static/ui/images/safari-pinned-tab-62813db097.svg" height="32" width="32" align="right"></a>

_A [First + Third](https://firstandthird.com) Project_
