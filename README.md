sinxelo
=======

A simple nodejs http server.

Just require and call start with the config path

```javascript
var sinxelo = require("./sinxelo");

sinxelo.start("config.json");
```
In the config you can specify right not the app dir and the http port for the server.

Right now its just a http web serving capable of serving files from a directory. Work in progress!
