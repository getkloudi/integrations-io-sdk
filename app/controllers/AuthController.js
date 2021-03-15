const IntegrationService = require('../services/IntegrationService');
const nconf = require('nconf');
const ReqHelper = require('../helpers/ReqHelper');
const ResHelper = require('../helpers/ResponseHelper');

/**
 * It is a middleware method to check if user is admin
 * If the user isAdmin request proceeds
 * Otherwise it ends by sending a response to the user
 *
 */
module.exports.isAdmin = async (req, res, next) => {
  try {
    const token = ReqHelper.getAuthorizationToken(req);
    if (token === nconf.get('ACCESS_TOKEN')) next();
    else ResHelper.sendUserNotAllowed(res);
  } catch (error) {
    ResHelper.sendBadAuthentication(res, error);
  }
};

module.exports.addDetailsToRequest = async (req, res, next) => {
  let { userId, projectId } = req.query;
  if (!userId) userId = req.body.userId;
  if (!projectId) projectId = req.body.projectId;
  if (!userId || !projectId) ResHelper.sendMissingParams(res);

  req.body = { ...req.body, userId: userId, projectId: projectId };
  if (!!userId && !!projectId && !!req.params && !!req.params.integration) {
    const result = await IntegrationService.search({
      userId: userId,
      projectId: projectId,
      name: req.params.integration.toUpperCase(),
    });

    if (result.data && result.data.length > 0) {
      //Refresh authAccessToken and then send the required data
      const integration = await IntegrationService.updateAccessToken(
        result.data[0]
      );
      req.body = { ...req.body, integration: integration._doc };
    } else {
      req.body = {
        ...req.body,
        integration: { data: result.data, name: '' },
      };
    }
  }

  if (!!req.params && !!req.params.entity)
    req.params.entity = req.params.entity.toUpperCase();

  next();
};
