const _ = require('lodash');
const dot = require('dot-object');

const errorCodes = {
  INVALID_INTEGRATION_TYPE: 'Invalid integration/integration type',
  INVALID_METHOD: 'Invalid method',
  INVALID_ENTITY: 'Invalid entity',
  INTEGRATION_NOT_CONFIGURED: 'Integration not configured',
  INTEGRATION_MISCONFIGURED: 'Multiple integrations found for these settings',
  INVALID_OPTION_PROVIDED: 'Invalide option provided as arguement',
  UNKNOWN_MAPPING_TYPE: 'Unknown mapping type',
  MAPPING_MISCONFIGURED: 'No valid mapping found',
  INPUT_MISCONFIGURED: 'Input not found',
  OUTPUT_MISCONFIGURED: 'Output not found',
  TRANSFORM_MISCONFIGURED: 'Transform not found',
};

checkAndConvertToArray = (options) => {
  if (!Array.isArray(options)) {
    return [options];
  }
  return options;
};

evaluateFunction = (original, transform, input, handler) => {
  if (transform.params && input.key)
    return eval(`handler.${transform.name}`).apply(this, [
      eval(`original.${input.key}`),
      ...transform.params,
    ]);
  else if (!transform.params && input.key)
    return eval(`handler.${transform.name}`).apply(this, [
      eval(`original.${input.key}`),
    ]);
  else return eval(`handler.${transform.name}`)(eval(`original`));
};

transformInput = (
  original,
  integration,
  transform,
  input,
  output,
  transformed
) => {
  let value;
  const handler = require(`../services/third-party/${integration.toLowerCase()}/TransformFunctionsRepo`);
  switch (transform.type) {
    case 'ONE-TO-ONE':
      if (!input.key) value = eval(`original`);
      else value = eval(`original.${input.key}`);
      break;
    case 'CONSTANT':
      value = transform.value;
      break;
    case 'FUNCTION':
      value = evaluateFunction(original, transform, input, handler);
      break;
    default:
      throw new Error(errorCodes[TRANSFORM_MISCONFIGURED]);
  }

  if (!output.parent && !output.key) transformed = { ...transformed, ...value };
  else if (!output.parent) _.set(transformed, output.key, value);
  else
    _.set(
      transformed,
      output.parent,
      _.get(transformed, output.parent, []).concat([
        output.key ? { [output.key]: value } : value,
      ])
    );
  return transformed;
};

getMappingDetails = (type, method, integration, entity) => {
  const mapper = require(`../services/third-party/${integration.toLowerCase()}/mapper`);
  let item = _.map(mapper, (o) => {
    const methods = o.method.split('|');
    const types = o.type.split('|');
    const entities = o.entity.split('|');
    if (
      (entities.indexOf(entity) !== -1 || entities.indexOf('ALL') !== -1) &&
      methods.indexOf(method) !== -1 &&
      o.integration === integration &&
      types.indexOf(type) !== -1
    ) {
      return o;
    }
  });

  // Remove undefines from the array
  item = _.without(item, undefined);
  if (item.length == 2) {
    item = item.filter((item) => {
      const entities = item.entity.split('|');
      return entities.indexOf('ALL') < 0;
    });
  }
  if (item.length == 0) {
    throw new Error(errorCodes['INTEGRATION_NOT_CONFIGURED']);
  } else if (item.length > 1) {
    throw new Error(errorCodes['INTEGRATION_MISCONFIGURED']);
  } else {
    if (!item[0].map) throw new Error(errorCodes['MAPPING_MISCONFIGURED']);
    else return item[0].map;
  }
};

module.exports.transform = (type, method, integration, entity, data) => {
  const result = [];
  const mapping = getMappingDetails(type, method, integration, entity);
  // check if incoming options are of type array, if not convert it to array
  data = checkAndConvertToArray(data);

  data.forEach((original) => {
    let transformed = {};
    mapping.forEach((item) => {
      const input = item.input;
      const output = item.output;
      const transform = item.transform;
      if (!input) throw new Error(errorCodes['INPUT_MISCONFIGURED']);
      if (!output) throw new Error(errorCodes['OUTPUT_MISCONFIGURED']);
      if (!transform) throw new Error(errorCodes['TRANSFORM_MISCONFIGURED']);

      if (input.parent) {
        const parent = eval(`original.${input.parent}`);
        parent.forEach((obj, index) => {
          let denormKey = `${input.parent}[${index}]`;
          if (input.key === undefined)
            throw new Error(errorCodes['INPUT_MISCONFIGURED']);
          /*
           * In the case key is not specified we transfer the entire object for transformation to transformInput
           */
          denormKey += `${input.key.length > 0 ? `.${input.key}` : ``}`;
          transformed = transformInput(
            original,
            integration,
            transform,
            {
              key: denormKey,
              parent: input.parent,
            },
            output,
            transformed
          );
        });
      } else {
        transformed = transformInput(
          original,
          integration,
          transform,
          input,
          output,
          transformed
        );
      }
    });
    result.push(transformed);
  });
  return result;
};
