/** Shared platform decoding options for inherited and inline point configuration. */
export const byteLayoutOptions = ['AB', 'BA', 'AB_CD', 'CD_AB', 'BA_DC', 'DC_BA', 'AB_CD_EF_GH', 'GH_EF_CD_AB', 'BA_DC_FE_HG', 'HG_FE_DC_BA'].map(value => ({ value, label: value }))

export const isEqual = (obj1: any, obj2: any): boolean => {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
};

const cloneValue = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).reduce((result, key) => {
      result[key] = cloneValue(value[key]);
      return result;
    }, {} as Record<string, any>);
  }

  return value;
};

export const cloneTemplateConfig = <T>(template: T | undefined, fallback: T): T => {
  return cloneValue(template ?? fallback);
};
