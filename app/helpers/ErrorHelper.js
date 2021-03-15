const Bugsnag = require('@bugsnag/js');
const nconf = require('nconf');
const Sentry = require('@sentry/node');

class ErrorHelper {
    static getError(message, status) {
        let err = new Error();
        err.message = message || 'Internal Server Error';
        err.status = status || 500;
        return err;
    }

    static sendErrorToThirdPartyTool(error) {
        Sentry.captureException(error);
        const bugsnagApiKey = nconf.get('BUGSNAG_API_KEY');
        if (bugsnagApiKey) {
            const bugsnagClient = Bugsnag(bugsnagApiKey);
            bugsnagClient.notify(error);
        }
        // Extra logging at this stage to make sure our logging systems are working fine.
        console.error(error);
    }
}

module.exports = ErrorHelper;
