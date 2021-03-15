const IntegrationController = require("../controllers/IntegrationController");
const AuthController = require("../controllers/AuthController");

module.exports = function (router) {
  router
    .route("/")
    .post(
      [AuthController.isAdmin, AuthController.addDetailsToRequest],
      IntegrationController.addIntegration
    )
    .get(
      [AuthController.isAdmin, AuthController.addDetailsToRequest],
      IntegrationController.getIntegrations
    )
    .delete(
      [AuthController.isAdmin, AuthController.addDetailsToRequest],
      IntegrationController.deleteIntegrations
    );

  router.route("/health-check").get(IntegrationController.performHealthCheck);

  router
    .route("/:integration")
    .post(
      [AuthController.isAdmin, AuthController.addDetailsToRequest],
      IntegrationController.addIntegration
    )
    .get(
      [AuthController.isAdmin, AuthController.addDetailsToRequest],
      IntegrationController.getIntegrationByName
    )
    .put(
      [AuthController.isAdmin],
      IntegrationController.updateIntegrationByName
    );

  router
    .route("/:integration/accessToken")
    .get(
      [AuthController.isAdmin, AuthController.addDetailsToRequest],
      IntegrationController.getAccessToken
    );

  router
    .route("/:integration/callback")
    .get(
      [AuthController.isAdmin, AuthController.addDetailsToRequest],
      IntegrationController.getCallback
    );

  router
    .route("/:integration/projects")
    .post(
      [AuthController.isAdmin, AuthController.addDetailsToRequest],
      IntegrationController.addThirdPartyProjects
    )
    .get(
      [AuthController.isAdmin, AuthController.addDetailsToRequest],
      IntegrationController.getThirdPartyProjects
    );

  router
    .route("/:integration/register-webhook")
    .post(
      [AuthController.isAdmin, AuthController.addDetailsToRequest],
      IntegrationController.registerWebhooks
    );

  router
    .route("/:integration/seed-actions-and-intents")
    .post(
      AuthController.isAdmin,
      IntegrationController.seedActionsAndIntentsForAnIntegration
    );

  router
    .route("/:integration/sync")
    .post(
      [AuthController.isAdmin, AuthController.addDetailsToRequest],
      IntegrationController.syncDataFromIntegration
    );

  router
    .route("/:integration/webhook-to-tasks-map")
    .get(
      [AuthController.isAdmin, AuthController.addDetailsToRequest],
      IntegrationController.getServiceWebhookToTaskMaps
    );

  router
    .route("/:integration/entities/:entity")
    .get(
      [AuthController.isAdmin, AuthController.addDetailsToRequest],
      IntegrationController.getThirdPartyEntity
    )
    .put(
      [AuthController.isAdmin, AuthController.addDetailsToRequest],
      IntegrationController.putThirdPartyEntity
    )
    .post(
      [AuthController.isAdmin, AuthController.addDetailsToRequest],
      IntegrationController.postThirdPartyEntity
    )
    .patch(
      [AuthController.isAdmin, AuthController.addDetailsToRequest],
      IntegrationController.patchThirdPartyEntity
    );
};
