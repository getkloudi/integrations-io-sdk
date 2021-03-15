const express = require("express");
const router = express.Router();
var path = require("path");
// Local dependecies
// configure middlewares
var bodyParser = require("body-parser");
var morgan = require("morgan");
var logger = require("winston");
var cors = require("cors");
const nconf = require("nconf");
const Sentry = require("@sentry/node");
const bugsnag = require("@bugsnag/js");
const bugsnagExpress = require("@bugsnag/plugin-express");
var app;

var server = function(cb) {
  "use strict";
  // Configure express
  app = express();
  const sentryDSN = nconf.get("SENTRY_DSN");
  const bugsnagApiKey = nconf.get("BUGSNAG_API_KEY");
  var bugsnagClient, bugsnagMiddleware;
  if (sentryDSN && sentryDSN.length > 0) {
    // SENTRY request handler must be the first middleware on the app
    Sentry.init({ dsn: sentryDSN });
    app.use(Sentry.Handlers.requestHandler());
  }
  if (bugsnagApiKey && bugsnagApiKey.length) {
    bugsnagClient = bugsnag(bugsnagApiKey);
  }
  if (bugsnagClient) {
    bugsnagClient.use(bugsnagExpress);
    bugsnagMiddleware = bugsnagClient.getPlugin("express");
    app.use(bugsnagMiddleware.requestHandler);
  }
  app.use(cors());
  app.use(morgan("common"));
  app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
  app.use(bodyParser.json({ type: "*/*", limit: "50mb" }));
  app.use(cors());

  logger.info("[SERVER] Initializing routes");
  require("./routes/integrations")(router);
  app.use(router);
  app.use(express.static(path.join(__dirname, "public")));
  // The SENTRY error handler must be before any other error middleware and after all controllers
  if (sentryDSN && sentryDSN.length > 0)
    app.use(Sentry.Handlers.errorHandler());
  if (bugsnagClient) app.use(bugsnagMiddleware.errorHandler);

  // Error handler
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json({
      message: err.message,
      error: app.get("env") === "development" ? err : {}
    });
    next(err);
  });
  app.listen(nconf.get("PORT"));
  logger.info(`[SERVER] Listening on port ${nconf.get("PORT")}`);
  if (cb) {
    return cb();
  }
};

module.exports = server;
