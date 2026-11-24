import { getBaseApi } from '@jetlinks-web-core/utils';
import { request } from '@jetlinks-web/core'

export const query = (data: any) =>
    request.post(`/data-collect/channel/_query`, data);

export const remove = (id: string) =>
    request.remove(`/data-collect/channel/${id}`);

export const detail = (id: string) =>
    request.get(`/data-collect/channel/${id}`);

export const save = (data: any) => request.post(`/data-collect/channel`, data);

export const update = (id: string, data: any) =>
    request.put(`/data-collect/channel/${id}`, data);

export const getProviders = () => request.get(`/data-collect/channel/providers`);

export const queryNoPaging = (data: any) =>
  request.post(`/data-collect/channel/_query/no-paging`, data);

export const queryOptionsList = (type: string) =>
    request.get(`/data-collect/opc/${type}`);

export const validateField = (data: any) =>
    request.post(`/data-collect/opc/endpoint/_validate`, data,  {
        headers: {
            'Content-Type': 'text/plain;charset=UTF-8',
        },
    });

export const queryCertificateList = () =>
    request.get(`/network/certificate/_query/no-paging?paging=false`, {});

export const getResourceFile = (provider: string, module: string) => request.get(`/data-collect/${provider}/resource/_/script/${module}.vue`, {}, { hiddenError: true });
export const getResourceLangFile = async (provider: string, language: string): Promise<unknown> => {
    return JSON.parse(await getResourceModule(`/data-collect/${provider}/resource/_/script/lang/${language}.json`));
};

/** Read dependencies of an installed SFC through the existing provider resource API. */
export async function getResourceModule(url: string): Promise<string> {
    if (!/^\/data-collect\/[^/]+\/resource\/_\/script\/.+\.(vue|js|mjs|ts|css|less|json)$/.test(url)) {
        throw new Error(`Unsupported plugin resource: ${url}`)
    }
    // Plugin files stay raw text until their consumer parses them, including JSON dictionaries.
    const source: unknown = await request.get(url, {}, { hiddenError: true, responseType: 'text' })
    if (typeof source !== 'string' || /<(?:!doctype|html)[\s>]/i.test(source)) {
        throw new Error(`Invalid plugin resource: ${url}`)
    }
    return source
}

/**
 * 通道导入模板下载
 */
export const channelDownloadImportTemplate = (provider: string, format: string) => request.get(`/data-collect/channel/${provider}/template.${format}`, {}, {responseType: 'blob'})

/**
 * 通道导入
 */
export const channelImport = (provider: string) => `${getBaseApi()}/data-collect/channel/${provider}/import`
