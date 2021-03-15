const Axios = require("axios");
const ErrorHelper = require("../helpers/ErrorHelper");
const IntegrationSchema = require("../schema/IntegrationSchema");
const KloudiWebhookHostnameHelper = require("../helpers/KloudiWebhookHostnameHelper");
const nconf = require("nconf");

const EXPOSED_INTEGRATION = [
  "AMAZON_EC2",
  "BITBUCKET",
  "JIRA",
  "SENTRY",
  "ROLLBAR",
  // "GITLAB",
  "GITHUB",
  // "CRASHLYTICS",
  "DATADOG",
];
const RESULT_LIMIT = 50;

getThirdPartyServiceFromName = function (name) {
  try {
    return require(`./third-party/${name.toLowerCase()}/${name
      .charAt(0)
      .toUpperCase()}${name.slice(1).toLowerCase()}Service.js`);
  } catch (error) {
    ErrorHelper.sendErrorToThirdPartyTool(error);
    return;
  }
};

module.exports.getSupportedIntegrations = function () {
  const integrations = [];
  for (const name of EXPOSED_INTEGRATION) {
    const service = getThirdPartyServiceFromName(name);
    if (service)
      integrations.push({
        type: "INTEGRATION",
        name: service.name,
        description: service.description,
        icon: service.icon,
        webhook: service.webhook,
        authMethod: service.authMethod,
        authEndpoint: service.authEndpoint,
        primaryAction: service.primaryAction,
        apiTokenURL: service.apiTokenURL,
      });
  }
  return integrations;
};

module.exports.search = async function (options, next, limit) {
  const skip = (next ? next : 0) * RESULT_LIMIT;
  limit = limit || RESULT_LIMIT;
  const res = {
    data: await IntegrationSchema.find(options)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit),
  };
  if (Object.keys(options).length <= 0)
    res.count = await IntegrationSchema.estimatedDocumentCount();
  else res.count = await IntegrationSchema.countDocuments(options);

  //Adding default value if nothing is returned
  if (!res.count) res.count = 0;

  return {
    ...res,
    next:
      res.count - res.data.length - next * RESULT_LIMIT > 0
        ? next + 1
        : undefined,
  };
};

module.exports.addIntegration = async function (
  userId,
  projectId,
  integrationName,
  options
) {
  const service = getThirdPartyServiceFromName(integrationName);
  let integrationData = {
    name: service.name,
    projectId: projectId,
    userId: userId,
    authMethod: service.authMethod,
    primaryAction: service.primaryAction,
    icon: service.icon,
  };
  const {
    accessToken,
    refreshToken,
    integrationSpecificParams,
  } = await service.connect(options.authParams);
  if (accessToken || refreshToken || integrationSpecificParams) {
    if (accessToken) integrationData.authAccessToken = accessToken;
    if (refreshToken) integrationData.authRefreshToken = refreshToken;
    if (integrationSpecificParams)
      integrationData.integrationSpecificParams = integrationSpecificParams;
    await IntegrationSchema.updateOne(
      { userId: userId, projectId: projectId, name: integrationName },
      integrationData,
      {
        upsert: true,
      }
    );
    return "OK";
  } else {
    throw ErrorHelper.getError(
      `Couldn't connect with ${integrationName.toLowerCase()}`,
      500
    );
  }
};

module.exports.getIntegrations = async function (userId, projectId) {
  const existingIntegrations = await this.getActiveIntegrations(
    userId,
    projectId
  );
  let integrations;
  if (!existingIntegrations || existingIntegrations.length === 0) {
    integrations = this.getSupportedIntegrations();
  } else {
    integrations = existingIntegrations;
    const newIntegrations = this.getSupportedIntegrations().filter((item) => {
      const temp = integrations.find(
        (integration) => integration.name === item.name
      );
      if (temp) return;
      else return item;
    });
    integrations = newIntegrations.concat(
      integrations.map((item) => ({ ...item, connected: true }))
    );
  }
  return integrations.map((item) => ({
    ...item,
    metrics: item.metrics ? item.metrics : [],
  }));
};

module.exports.deleteIntegrations = async function (userId, projectId) {
  await IntegrationSchema.deleteMany({ userId: userId, projectId: projectId });
  return "Ok";
};

module.exports.getIntegrationByName = async function (
  userId,
  projectId,
  integrationName
) {
  let integrations = await this.getIntegrations(userId, projectId);
  const integration = integrations.filter(
    (item) => item.name === integrationName
  );
  if (integration) return integration;
  else return "No integration found";
};

module.exports.getActiveIntegrations = async function (userId, projectId) {
  const res = await this.search({
    userId: userId,
    projectId: projectId,
  });
  const existingIntegrations = res.data || [];
  const integrations = existingIntegrations.map((item) => {
    let metrics = [
      {
        key: `Connected projects`,
        value:
          item.thirdPartyProjects.length > 0
            ? item.thirdPartyProjects.length
            : 0,
      },
    ];

    if (
      item.integrationSpecificParams &&
      item.integrationSpecificParams.totalThirdPartyProjects &&
      item.thirdPartyProjects.length <
        item.integrationSpecificParams.totalThirdPartyProjects
    )
      metrics.push({
        key: `Available projects`,
        value: item.integrationSpecificParams.totalThirdPartyProjects,
      });

    return {
      type: "INTEGRATION",
      name: item.name,
      connected: true,
      icon: item.icon,
      authMethod: item.authMethod,
      authAccessToken: item.authAccessToken,
      primaryAction: item.primaryAction,
      integrationSpecificParams: item.integrationSpecificParams || [],
      description:
        item.thirdPartyProjects.length > 0
          ? item.name.slice(0, 1).toUpperCase() +
            item.name.slice(1, item.name.length).toLowerCase() +
            " is successfully connected with KLOUDI. Take a look at some of the stats!"
          : item.name.slice(0, 1).toUpperCase() +
            item.name.slice(1, item.name.length).toLowerCase() +
            " is successfully connected with KLOUDI. Add a project to get started!",
      thirdPartyProjects:
        item.thirdPartyProjects.length > 0 ? item.thirdPartyProjects : [],
      metrics: metrics,
    };
  });

  return integrations;
};

module.exports.getActiveIntegrationByName = async function (
  userId,
  projectId,
  integrationName
) {
  let integrations = await this.getActiveIntegrations(userId, projectId);
  const integration = integrations.filter(
    (item) => item.name === integrationName
  );
  if (integration) return integration;
  else return `No active integration by the name ${integrationName} found`;
};

module.exports.addThirdPartyProjects = async function (integration, projects) {
  const existingProjects = integration.thirdPartyProjects;
  if (!existingProjects && existingProjects.length == 0) {
    await IntegrationSchema.updateOne(
      { _id: integration._id },
      {
        thirdPartyProjects: projects,
      }
    );
  } else {
    await IntegrationSchema.updateOne(
      { _id: integration._id },
      {
        $push: {
          thirdPartyProjects: {
            $each: projects,
          },
        },
      }
    );
  }

  return [
    `All ${
      projects.length
    } have successfully been added to ${integration.name.toLowerCase()}`,
  ];
};

module.exports.getThirdPartyProjects = async function (integration, options) {
  const service = getThirdPartyServiceFromName(integration.name);
  if (service && service.getThirdPartyProjects) {
    const res = await service.getThirdPartyProjects(options);
    const data = res.data;
    await IntegrationSchema.updateOne(
      { _id: integration._id },
      {
        integrationSpecificParams: {
          ...integration.integrationSpecificParams,
          totalThirdPartyProjects: data.length,
        },
      }
    );
    return data;
  } else throw ErrorHelper.getError("Integration not found");
};

module.exports.registerWebhooks = async function (
  userId,
  projectId,
  integration,
  options
) {
  const projects = options.projects;
  delete options.projects;
  if (projects && projects.length > 0) {
    const service = getThirdPartyServiceFromName(integration.name);
    if (service.webhooks && service.registerWebhooks) {
      for (const item of projects) {
        const webhookHostname = await KloudiWebhookHostnameHelper.getHostnameForWebhookRegistration();
        const webhookURL = `${webhookHostname}/${userId}/${projectId}/GITHUB/${item.owner}/${item.repo}`;

        const res = await service.registerWebhooks({
          userId: userId,
          projectId: projectId,
          body: {
            webhookEvents: Array.from(new Set(service.webhooks)),
            webhookURL: webhookURL,
          },
          project: item,
          ...options,
        });
      }
      await IntegrationSchema.updateOne(
        { _id: integration._id },
        { webhookStatus: "ACTIVE" }
      );
      return "Ok";
    } else
      return "Either no webhook exists or webhookstatus is equal to ACTIVE";
  } else
    return ErrorHelper.getError("No projects to register webhook to.", 500);
};

module.exports.seedActionsAndIntentsForAnIntegration = async function (name) {
  try {
    name = name.toLowerCase();
    const intents = require(`./third-party/${name}/intent.json`);
    await Axios.default.post(
      `${nconf.get("API_ENDPOINT")}/intents/raw-json`,
      intents,
      {
        headers: {
          Authorization: nconf.get("API_ACCESS_TOKEN"),
        },
      }
    );
    const actions = require(`./third-party/${name}/action.json`);
    await Axios.default.post(
      `${nconf.get("API_ENDPOINT")}/actions/raw-json`,
      actions,
      {
        headers: {
          Authorization: nconf.get("API_ACCESS_TOKEN"),
        },
      }
    );
    if (nconf.get("ENV") === "development")
      await Axios.default.post(
        `${nconf.get("API_ENDPOINT")}/dialogflow/intents/${name}`,
        { actions: actions, intents: intents },
        {
          headers: {
            Authorization: nconf.get("API_ACCESS_TOKEN"),
          },
        }
      );
  } catch (error) {
    ErrorHelper.sendErrorToThirdPartyTool(
      new Error(`Integration ${name} is not supported`)
    );
  } finally {
    return "Ok";
  }
};

module.exports.syncDataFromIntegration = async function (
  userId,
  projectId,
  integration,
  options
) {
  const projects = options.projects;
  delete options.projects;
  if (projects && projects.length > 0) {
    const service = getThirdPartyServiceFromName(integration.name);
    for (const item of projects) {
      if (service.syncIntegrationEntities) {
        await service.syncIntegrationEntities(integration, {
          userId: userId,
          projectId: projectId,
          thirdPartyProject: item,
          ...options,
        });
      }
    }
    return "Ok";
  } else return ErrorHelper.getError("No projects to sync", 500);
};

module.exports.getServiceWebhookToTaskMaps = function (integration) {
  const service = getThirdPartyServiceFromName(integration.name);
  if (service && service.webhookToTasksMap) return service.webhookToTasksMap;
  else return ErrorHelper.getError("No service is available", 500);
};

module.exports.getAccessToken = async function (integration) {
  const service = getThirdPartyServiceFromName(integration.name);
  if (integration.authRefreshToken && service.getAccessToken)
    return await service.getAccessToken(integration);
  else return integration.authAccessToken;
};

module.exports.updateAccessToken = async function (integration) {
  const service = getThirdPartyServiceFromName(integration.name);
  if (
    integration.authRefreshToken &&
    service.getAccessToken &&
    integration.integrationSpecificParams.authAccessTokenExpiresAt &&
    Date.now() -
      integration.integrationSpecificParams.authAccessTokenExpiresAt >=
      1000
  ) {
    const token = await service.getAccessToken(integration);
    await integration.updateOne({ authAccessToken: token });
    integration.authAccessToken = token;
    return integration;
  } else return integration;
};

module.exports.getThirdPartyEntity = async function (
  entity,
  integration,
  options
) {
  const service = getThirdPartyServiceFromName(integration.name);
  if (service) {
    const res = await service.get(entity, options);
    const data = res.data;
    const next = res.next;
    if (entity === "PROJECTS")
      await integration.updateOne({
        integrationSpecificParams: {
          ...integration.integrationSpecificParams,
          totalThirdPartyProjects: data.length,
        },
      });
    if (!!next) return { data, next };
    return { data };
  } else throw ErrorHelper.getError("Integration not found");
};

module.exports.putThirdPartyEntity = async function (
  entity,
  integration,
  options
) {
  const service = getThirdPartyServiceFromName(integration.name);
  if (service) {
    const res = await service.put(entity, options);
    const data = res.data;
    return data;
  } else throw ErrorHelper.getError("Integration not found");
};

module.exports.putThirdPartyEntityFromIntegration = async function (
  integration,
  entity,
  options
) {
  const service = getThirdPartyServiceFromName(integration.name);
  if (service) {
    return await service.put(entity, {
      ...options,
      integrationData: integration,
    });
  } else {
    throw ErrorHelper.getError("Integration not found", 404);
  }
};

module.exports.postThirdPartyEntity = async function (
  entity,
  integration,
  options
) {
  const service = getThirdPartyServiceFromName(integration.name);
  if (service) {
    const res = await service.post(entity, options);
    const data = res.data;
    return data;
  } else throw ErrorHelper.getError("Integration not found");
};

module.exports.postThirdPartyEntityFromIntegration = async function (
  integration,
  entity,
  options
) {
  const service = getThirdPartyServiceFromName(integration.name);
  if (service) {
    return await service.post(entity, {
      ...options,
      integrationData: integration,
    });
  } else {
    throw ErrorHelper.getError("Integration not found", 404);
  }
};

module.exports.patchThirdPartyEntity = async function (
  entity,
  integration,
  options
) {
  const service = getThirdPartyServiceFromName(integration.name);
  if (service) {
    const res = await service.patch(entity, options);
    const data = res.data;
    return data;
  } else throw ErrorHelper.getError("Integration not found");
};

module.exports.update = async function (integration, data) {
  if (!integration) return "Incorrect integration";
  if (!data || data.length <= 0) return "Nothing to update";

  const item = await IntegrationSchema.findOneAndUpdate(
    { _id: integration._id },
    data,
    {
      new: true,
      upsert: true,
    }
  );

  return [item];
};
