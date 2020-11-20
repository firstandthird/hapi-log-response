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

Log request and response payloads based on statusCode

## Instalation

```sh
npm install hapi-log-response
```

_or_

```sh
yarn add hapi-log-response
```


## Usage

```javascript
const Hapi = require('@hapi/hapi');
const server = Hapi.server({
  debug: {
    request: ['error']
  },
  port: 8080
});
await server.register([
  // ... other plugins like hapi-logr
  { plugin: require('hapi-log-response'),
    options: {}
  }
]);
```

---

<a href="https://firstandthird.com"><img src="https://firstandthird.com/_static/ui/images/safari-pinned-tab-62813db097.svg" height="32" width="32" align="right"></a>

_A [First + Third](https://firstandthird.com) Project_
