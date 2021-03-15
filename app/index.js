const async = require('async');
const logger = require('winston');
const mongoose = require('mongoose');
const nconf = require('nconf');
// Load Environment variables from .env file
require('dotenv').config();
// Set up configs
nconf.use('memory');
// First load command line arguments
nconf.argv();
// Load environment variables
nconf.env();

logger.info('[APP] Starting server initialization');
// [START trace_setup_nodejs_app]
if (nconf.get('ENV') === 'production')
  require('dd-trace').init({
    analytics: true,
    DD_ENV: nconf.get('ENV'),
    DD_SERVICE_NAME: 'minion:integrations-io',
  });

// Initialize Modules
async.series(
  [
    function initializeDBConnection(callback) {
      const dbUri = nconf.get('DB_URI');
      // const MongooseRedisCache = require("./helpers/MongooseRedisCache");
      // MongooseRedisCache(mongoose);

      mongoose.connect(
        dbUri,
        {
          useUnifiedTopology: true,
          useNewUrlParser: true,
          useFindAndModify: false,
        },
        function (err) {
          if (err) {
            logger.error('database initialization failed', err);
            throw err;
          } else {
            logger.info('initialized database');
            callback();
          }
        }
      );
    },
    function initializeThirdPartyKeys(callback) {
      if (nconf.get('PLATFORM') === 'cloud') {
        const loadKeys = require('./config/loadKeys');
        loadKeys(nconf.get('ENV')).then((pairs) => {
          for (let pair of pairs) {
            nconf.set(pair.key, pair.value);
          }
          callback();
        });
      } else callback();
    },
    function startServer(callback) {
      var server = require('./server');
      server(callback);
    },
  ],
  function (err) {
    if (err) {
      logger.error('[APP] initialization failed', err);
    } else {
      logger.info('[APP] initialized SUCCESSFULLY');
    }
  }
);
