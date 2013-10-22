sinxelo
=======

A simple nodejs http server used to serve static files. 
The ideas is to implement a web server using just Node Core, including domains, cluster and streams.
Right know it just has some of the initial versión with some features like cluster and domains, but expect some updates in the near future with more.


To begin just require sinxelo and call start with the config path:

```javascript
var sinxelo = require("./sinxelo");

sinxelo.start("config.json");
```

The config file is where your settings are defined. Right now it just has a couple of things:

Key | Default | Description
--- | --- | ---
path | './app' | Path to the root directory where is all the static content
port | 8080 | Port where the http is going to start listening for requests
