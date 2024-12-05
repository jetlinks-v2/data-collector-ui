import { request } from '@jetlinks-web/core'
import {LocalStore} from "@jetlinks-web/utils";
import { TOKEN_KEY, } from '@jetlinks-web/constants'


const BASE_API_PATH = import.meta.env.VITE_APP_BASE_API
export const FileUpload = `${BASE_API_PATH}/file/upload`;
/**
 * 查询数据
 * @param data 分页搜索数据
 * @returns
 */
export const query = (data?: Record<string, any>) => request.post('/device-instance/_query', data)

/**
 * 删除设备
 * @param id 设备ID
 * @returns
 */
export const _delete = (id: string) => request.remove(`/device-instance/${id}`)

/**
 * 启用设备
 * @param id 设备ID
 * @param data
 * @returns
 */
export const _deploy = (id: string) => request.post(`/device-instance/${id}/deploy`)

/**
 * 禁用设备
 * @param id 设备ID
 * @param data
 * @returns
 */
export const _undeploy = (id: string) => request.post(`/device-instance/${id}/undeploy`)

/**
 * 根据条件查询产品（不带翻页）
 * @param data 查询条件
 * @returns
 */
export const queryNoPagingPost = (data: any) => request.post(`/device-product/_query/no-paging?paging=false`, data)

/**
 * 查询产品列表(分页)
 * @param data 查询条件
 */
export const queryProductList = (data: any) => request.post('/device-product/_query', data)

/**
 * 根据条件查询产品详情列表（不带翻页）
 * @param data 查询条件
 * @returns
 */
export const queryProductDetailAllList = (data?: any) => request.post(`/device-product/detail/_query/no-paging`, data);

/**
 * 查询固件列表
 */
 export const queryFirmwareList = (data: object) => request.post(`/firmware/_query/`, data);

/**
 * 查询产品分类树形数据
 */
export const queryTree = (params?: Record<string, any>) => request.post('/device/category/_tree', params)

/**
 * 修改设备信息
 * @param data 设备信息
 * @returns
 */
export const update = (data: Partial<any>) => data.id ? request.patch(`/device-instance`, data) : request.post(`/device-instance`, data)

/**
 * 验证设备ID是否重复
 * @param id 设备id
 * @returns
 */
export const isExists = (id: string) => request.get(`/device-instance/${id}/exists`)

/**
 * 新增设备
 */
export const addDevice = (params: any) => request.post("/device-instance", params)

/**
 * 修改设备
 */
export const editDevice = (params: any) => request.patch('/device-instance', params)

/**
 * 根据设备ID获取设备详情
 * @param id 设备ID
 * @returns 设备详情
 */
export const detail = (id: string) => request.get(`/device-instance/${id}/detail`, {}, {})


//视频设备相关
export const DeviceApi = {
    list: (data: any) => request.post(`/media/device/_query/`, data),
    // 详情
    detail: (id: string): any => request.get(`/media/device/${id}`),
    // 新增
    save: (data: any) => request.post(`/media/device/${data.channel}`, data),
    // 修改
    update: (data: any) => request.put(`/media/device/${data.channel}/${data.id}`, data),
    del: (id: string) => request.remove(`/media/device/${id}`),
    // 更新通道
    updateChannels: (id: string) => request.post(`/media/device/${id}/channels/_sync`),
    // post查询产品列表
    queryProductList: (data: any) => request.post<any[]>(`/device/product/_query/no-paging`, data),
    // get获取产品
    getProductList: (data: any) => request.get(`/device/product/_query/no-paging?paging=false`, data),
    // 快速添加产品
    saveProduct: (data: any) => request.post<any>(`/device/product`, data),
    // 产品发布
    deployProductById: (id: string) => request.post<any>(`/device/product/${id}/deploy`),
    // 查询设备接入配置
    queryProvider: (data?: any) => request.post<any>(`/gateway/device/detail/_query`, data),
    // 查询网关配置
    getConfiguration: (id: string, transport: string) => request.get<any>(`/protocol/${id}/${transport}/configuration`),
    //校验ID合法
    validateId: (id:string) => request.get<any>('/media/device/id/_validate',{id:id})
}

/**
 * 根据指定的接入方式获取产品需要的配置信息
 * @pId 产品id
 * @accessId 设备接入id
 */
export const getAccessConfig = (pId: string, accessId: string) => request.get(`/device-product/${pId}/${accessId}/config-metadata`)

/**
 * 获取插件支持的产品信息
 * 用于在产品选择接入方式后，选择产品类型。
 * 即将平台中当前产品与插件中指定的产品绑定，然后把插件的物模型保存到产品并且绑定产品ID映射关系
 * @param id
 */
export const getProductsById = (id: string) => request.get(`/plugin/driver/${id}/products`)

/**
 *
 * @param type product：产品;device：设备
 * @param pluginId 设备接入id
 * @param internalId 产品或者设备id
 * @param externalId  映射id
 */
export const savePluginData = (type: string, pluginId: string, internalId: string, externalId: string ) => request.patch(`/plugin/mapping/${type}/${pluginId}/${internalId}`, externalId, { headers: {'Content-Type': "text/plain"}})



export const templateDownload = (productId: string, type: string) => request.get(`/device-instance/${productId}/template.${type}`, {}, { responseType: 'blob' })
/**
 * 设备导入
 * @param productId 产品id
 * @param type 文件类型
 * @returns
 */
export const deviceImport = (productId: string, fileUrl: string, autoDeploy: boolean) => `${BASE_API_PATH}/device-instance/${productId}/import/_withlog?fileUrl=${fileUrl}&autoDeploy=${autoDeploy}&:X_Access_Token=${LocalStore.get(TOKEN_KEY)}`

/**
 * 保存产品
 * @param data 产品信息
 * @returns
 */
export const saveProductMetadata = (data: Record<string, unknown>) => request.patch('/device-product', data)
/**
 * 聚合统计
 */
export const dashboard = (data?:any) => request.post('/dashboard/_multi',data);

/**
 * 获取最新属性值
 * @param deviceId 设备id
 * @param type 属性id
 * @returns
 */
export const getProperty = (deviceId: string, type: string) => request.get(`/device/standard/${deviceId}/property/${type}`)

export const queryPluginAccessDetail = (id: string) => request.get(`/plugin/driver/${id}`)

export const getPluginData = (type: string, pluginId: string, internalId: string ) => request.get(`/plugin/mapping/${type}/${pluginId}/${internalId}`)

export const getCommandsByAccess = (id: string) => request.get(`/gateway/device/${id}/commands`)

export const getCommandsDevicesByAccessId = (id: string, data: any) => request.post(`/gateway/device/${id}/command/QueryDevicePage`, data)
