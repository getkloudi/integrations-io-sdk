const ErrorHelper = require("../helpers/ErrorHelper");
const IntegrationEntityMapperHelper = require("../helpers/IntegrationEntityMapperHelper");
const IntegrationService = require("../services/IntegrationService");
const RequestHelper = require("../helpers/ReqHelper");
const ResponseHelper = require("../helpers/ResponseHelper");

getOptionsFromRequest = (method, integration, entity, req) => {
  let options;
  try {
    options = IntegrationEntityMapperHelper.transform(
      "REQUEST",
      method,
      integration,
      entity,
      {
        body: req.body,
        method: method,
        params: req.params,
        query: RequestHelper.getQueryParams(req),
      }
    )[0];
  } catch (err) {
    ErrorHelper.sendErrorToThirdPartyTool(err);
    options = {
      ...RequestHelper.getQueryParams(req),
      ...req.body,
    };
  } finally {
    return options;
  }
};

class IntegrationController {
  async addIntegration(req, res) {
    try {
      let { integrationName, ...options } = req.body;
      if (req.params.integration) integrationName = req.params.integration;
      integrationName = integrationName.toUpperCase();
      const data = await IntegrationService.addIntegration(
        req.body.userId,
        req.body.projectId,
        integrationName,
        options
      );
      ResponseHelper.sendResponse(res, data);
    } catch (err) {
      ResponseHelper.sendErrorResponse(res, err);
    }
  }

  async getIntegrations(req, res) {
    const options = RequestHelper.getQueryParams(req);
    try {
      let data;
      switch (options.filter) {
        case "active":
          data = await IntegrationService.getActiveIntegrations(
            req.body.userId,
            req.body.projectId
          );
          break;
        case "available":
        case "supported":
          data = await IntegrationService.getSupportedIntegrations();
          break;
        case "all":
        default:
          data = await IntegrationService.getIntegrations(
            req.body.userId,
            req.body.projectId
          );
          break;
      }
      ResponseHelper.sendResponse(res, data);
    } catch (err) {
      ResponseHelper.sendErrorResponse(res, err);
    }
  }

  async deleteIntegrations(req, res) {
    try {
      const data = await IntegrationService.deleteIntegrations(
        req.body.userId,
        req.body.projectId
      );
      ResponseHelper.sendResponse(res, data);
    } catch (err) {
      ResponseHelper.sendErrorResponse(res, err);
    }
  }

  async getIntegrationByName(req, res) {
    const options = RequestHelper.getQueryParams(req);
    try {
      let data;
      if (options.filter === "active")
        data = await IntegrationService.getActiveIntegrationByName(
          req.body.userId,
          req.body.projectId,
          req.params.integration.toUpperCase()
        );
      else
        data = await IntegrationService.getIntegrationByName(
          req.body.userId,
          req.body.projectId,
          req.params.integration.toUpperCase()
        );
      ResponseHelper.sendResponse(res, data);
    } catch (err) {
      ResponseHelper.sendErrorResponse(res, err);
    }
  }

  async updateIntegrationByName(req, res) {
    const options = RequestHelper.getQueryParams(req);
    const integration = (
      await IntegrationService.search({
        userId: options.userId,
        projectId: options.projectId,
        name: req.params.integration.toUpperCase(),
      })
    ).data[0];
    try {
      const data = await IntegrationService.update(integration, req.body);
      ResponseHelper.sendResponse(res, data);
    } catch (err) {
      ResponseHelper.sendErrorResponse(res, err);
    }
  }

  async getAccessToken(req, res) {
    if (!req.body.integration) ResponseHelper.sendMissingParams(res);
    try {
      const integration = req.params.integration;
      ResponseHelper.sendResponse(
        res,
        await IntegrationService.getAccessToken(integration)
      );
    } catch (error) {
      ResponseHelper.sendErrorResponse(res, error);
    }
  }

  async getCallback(req, res) {
    if (!req.body.integration) ResponseHelper.sendMissingParams(res);
    try {
      ResponseHelper.sendResponse(res, {
        text: "Post this data to /integrations endpoint",
        value: {
          name: req.body.integration.name,
          authParams: { code: RequestHelper.getQueryParams(req).code },
        },
      });
    } catch (err) {
      ResponseHelper.sendErrorResponse(res, err);
    }
  }

  async addThirdPartyProjects(req, res) {
    if (!req.body.integration) ResponseHelper.sendMissingParams(res);
    try {
      const integration = req.body.integration;
      const options = getOptionsFromRequest(
        "POST",
        integration.name,
        "PROJECTS",
        req
      );
      const data = await IntegrationService.addThirdPartyProjects(
        integration,
        req.body.projects
      );
      ResponseHelper.sendResponse(res, data);
    } catch (error) {
      ResponseHelper.sendErrorResponse(res, error);
    }
  }

  async getThirdPartyProjects(req, res) {
    if (!req.body.integration) ResponseHelper.sendMissingParams(res);
    try {
      const { integration } = req.body;
      const options = getOptionsFromRequest(
        "GET",
        integration.name,
        "PROJECTS",
        req
      );
      const data = await IntegrationService.getThirdPartyProjects(
        integration,
        options
      );
      ResponseHelper.sendMappedResponse(res, data, {
        entity: "PROJECTS",
        integration: integration.name,
        method: "GET",
      });
    } catch (error) {
      ResponseHelper.sendErrorResponse(res, error);
    }
  }

  async registerWebhooks(req, res) {
    if (!req.body.integration) ResponseHelper.sendMissingParams(res);
    try {
      const integration = req.body.integration;
      const options = getOptionsFromRequest(
        "POST",
        integration.name,
        "WEBHOOKS",
        req
      );
      const data = await IntegrationService.registerWebhooks(
        req.body.userId,
        req.body.projectId,
        integration,
        options
      );
      ResponseHelper.sendResponse(res, data);
    } catch (err) {
      ResponseHelper.sendErrorResponse(res, err);
    }
  }

  async getServiceWebhookToTaskMaps(req, res) {
    if (!req.body.integration) ResponseHelper.sendMissingParams(res);
    try {
      const integration = req.body.integration;
      const data = IntegrationService.getServiceWebhookToTaskMaps(integration);
      ResponseHelper.sendResponse(res, data);
    } catch (err) {
      ResponseHelper.sendErrorResponse(res, err);
    }
  }

  async seedActionsAndIntentsForAnIntegration(req, res) {
    if (!req.params.integration) ResponseHelper.sendMissingParams(res);
    try {
      const integration = req.params.integration;
      const data = await IntegrationService.seedActionsAndIntentsForAnIntegration(
        integration
      );
      ResponseHelper.sendResponse(res, data);
    } catch (err) {
      ResponseHelper.sendErrorResponse(res, err);
    }
  }

  async syncDataFromIntegration(req, res) {
    if (!req.body.integration) ResponseHelper.sendMissingParams(res);
    try {
      const integration = req.body.integration;
      const options = getOptionsFromRequest(
        "POST",
        integration.name,
        "WEBHOOKS",
        req
      );
      const data = await IntegrationService.syncDataFromIntegration(
        req.body.userId,
        req.body.projectId,
        integration,
        options
      );
      ResponseHelper.sendResponse(res, data);
    } catch (err) {
      ResponseHelper.sendErrorResponse(res, err);
    }
  }

  async getThirdPartyEntity(req, res) {
    if (!req.body.integration) ResponseHelper.sendMissingParams(res);
    try {
      const entity = req.params.entity;
      const integration = req.body.integration;
      const options = getOptionsFromRequest(
        "GET",
        integration.name,
        entity,
        req
      );

      const { data, next } = await IntegrationService.getThirdPartyEntity(
        entity,
        integration,
        options
      );
      ResponseHelper.sendMappedResponse(res, data, {
        entity: entity,
        integration: integration.name,
        method: "GET",
        next: next,
      });
    } catch (err) {
      ResponseHelper.sendErrorResponse(res, err);
    }
  }

  async putThirdPartyEntity(req, res) {
    try {
      const entity = req.params.entity;
      const integration = req.body.integration;
      const options = getOptionsFromRequest(
        "PUT",
        integration.name,
        entity,
        req
      );

      const data = await IntegrationService.putThirdPartyEntity(
        entity,
        integration,
        options
      );
      ResponseHelper.sendMappedResponse(res, data, {
        entity: entity,
        integration: integration.name,
        method: "PUT",
      });
    } catch (err) {
      ResponseHelper.sendErrorResponse(res, err);
    }
  }

  async postThirdPartyEntity(req, res) {
    try {
      const entity = req.params.entity;
      const integration = req.body.integration;
      const options = getOptionsFromRequest(
        "POST",
        integration.name,
        entity,
        req
      );

      const data = await IntegrationService.postThirdPartyEntity(
        entity,
        integration,
        options
      );
      ResponseHelper.sendMappedResponse(res, data, {
        entity: entity,
        integration: integration.name,
        method: "POST",
      });
    } catch (err) {
      ResponseHelper.sendErrorResponse(res, err);
    }
  }

  async patchThirdPartyEntity(req, res) {
    try {
      const entity = req.params.entity;
      const integration = req.body.integration;
      const options = getOptionsFromRequest(
        "PATCH",
        integration.name,
        entity,
        req
      );

      const data = await IntegrationService.patchThirdPartyEntity(
        entity,
        integration,
        options
      );
      ResponseHelper.sendMappedResponse(res, data, {
        entity: entity,
        integration: integration.name,
        method: "PATCH",
      });
    } catch (err) {
      ResponseHelper.sendErrorResponse(res, err);
    }
  }

  async performHealthCheck(req, res) {
    try {
      const data = "Welcome to Kloudi's Integrations IO Minion";
      ResponseHelper.sendResponse(res, data);
    } catch (err) {
      ResponseHelper.sendErrorResponse(res, err);
    }
  }
}

module.exports = new IntegrationController();
