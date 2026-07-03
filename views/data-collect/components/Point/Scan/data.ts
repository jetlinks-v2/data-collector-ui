type PlainRecord = Record<string, any>;

const cloneValue = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).reduce((result, key) => {
      result[key] = cloneValue(value[key]);
      return result;
    }, {} as PlainRecord);
  }

  return value;
};

const mergeDefaults = (defaults: PlainRecord, value: PlainRecord): PlainRecord => {
  const result = cloneValue(defaults);

  Object.keys(value || {}).forEach((key) => {
    const currentValue = value[key];
    const defaultValue = result[key];

    if (currentValue === undefined) {
      return;
    }

    if (key === 'features' && Array.isArray(defaultValue) && Array.isArray(currentValue)) {
      result[key] = Array.from(new Set([...defaultValue, ...currentValue]));
      return;
    }

    if (
      defaultValue &&
      currentValue &&
      !Array.isArray(defaultValue) &&
      !Array.isArray(currentValue) &&
      typeof defaultValue === 'object' &&
      typeof currentValue === 'object'
    ) {
      result[key] = mergeDefaults(defaultValue, currentValue);
    } else {
      result[key] = cloneValue(currentValue);
    }
  });

  return result;
};

export const applyCollectorPointTemplate = (points: PlainRecord[], collector: PlainRecord = {}) => {
  const template = collector?.configuration?.template;

  if (!template || !Object.keys(template).length) {
    return points;
  }

  return points.map((point) => mergeDefaults(template, point));
};
