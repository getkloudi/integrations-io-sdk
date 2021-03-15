class ReqHelper {
  /**
   *
   * @param {*} req
   * @param {*} requiredParams
   * @returns {Boolean}
   */
  static validateRequest(req, requiredParams) {
    let valid = true;
    Object.keys(requiredParams).forEach(key => {
      let params = requiredParams[key];
      params.forEach(param => {
        if (req[key][param] === undefined) {
          valid = false;
        } else {
          valid = true && valid;
        }
      });
    });
    return valid;
  }

  static getMissingParams(req, requiredParams) {
    let valid = true;
    let missingParams = [];
    Object.keys(requiredParams).forEach(key => {
      let params = requiredParams[key];
      params.forEach(param => {
        if (req[key][param] === undefined) {
          valid = false;
          missingParams.push(param);
        } else {
          valid = true && valid;
        }
      });
    });
    return missingParams;
  }

  static extractInput(req, expectedParams) {
    let res = {};
    Object.keys(expectedParams).forEach(key => {
      let params = expectedParams[key];
      params.forEach(param => {
        if (req[key][param] !== undefined) {
          res[param] = req[key][param];
        }
      });
    });
    return res;
  }

  static getAuthorizationToken(req) {
    return req.get("Authorization");
  }

  static getQueryParams(req) {
    for (const key in req.query) {
      let value = req.query[key];
      try {
        req.query[key] = JSON.parse(value);
      } catch (error) {
        continue;
      }
    }
    return req.query;
  }
}

module.exports = ReqHelper;
