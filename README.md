sinxelo
=======

A simple nodejs http server.

Just require, call spawn with the server name, and call start with the root path and port:

```javascript
var sinxelo = require("./sinxelo");

var server = sinxelo.spawn("main");
server.start("view", root);
```

Right now its just a http web serving capable of serving files from a directory. Work in progress!
