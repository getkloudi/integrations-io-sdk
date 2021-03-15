const IntegrationEntityMapperHelper = require("./IntegrationEntityMapperHelper");
const ErrorHelper = require("./ErrorHelper");

class ResponseHelper {
  static sendErrorResponse(res, err) {
    ErrorHelper.sendErrorToThirdPartyTool(err);
    let status = err.status || 500;
    res.status(status).send({
      status: status,
      message: err.message,
      data: [],
    });
  }

  static sendResponse(res, data, metaData) {
    res.send({
      status: 200,
      message: "OK",
      data: data,
      metaData: metaData,
    });
  }

  static sendMappedResponse(res, data, metaData) {
    try {
      data = IntegrationEntityMapperHelper.transform(
        "RESPONSE",
        metaData.method,
        metaData.integration,
        metaData.entity,
        data
      );
    } catch (error) {
    } finally {
      if (!Array.isArray(data)) data = [data];
      res.send({
        status: 200,
        message: "OK",
        data: data,
        ...metaData,
      });
    }
  }

  static sendPaginatedResponse(res, data, metaData) {
    res.send({
      status: 200,
      message: "OK",
      metaData: metaData,
      ...data,
    });
  }

  static sendBadAuthentication(res) {
    res.send({
      status: 401,
      message: "Unauthorized request, Try sign in again",
    });
  }

  static sendUserNotAllowed(res) {
    const status = 403;
    res.status(status).send({
      status: status,
      message: "User not allowed to make request. Please contact your admin",
    });
  }

  static sendMissingParams(res) {
    const status = 400;
    res.status(status).send({
      status: status,
      message: "Missing parameters in request",
    });
  }
}

module.exports = ResponseHelper;
