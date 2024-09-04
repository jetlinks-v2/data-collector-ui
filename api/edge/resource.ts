import { request } from '@jetlinks-web/core'

export const query = (data: Record<string, any>) => request.post(`/entity/template/_query`, data)

export const modify = (id: string, data: Record<string, any>) => request.put(`/entity/template/${id}`, data)

export const _delete = (id: string) => request.remove(`/entity/template/${id}`)

export const _start = (data: Record<string, any>) => request.post(`/entity/template/start/_batch`, data)

export const _stop = (data: Record<string, any>) => request.post(`/entity/template/stop/_batch`, data)

export const queryDeviceList = (data: Record<string, any>) => request.post(`/device-instance/detail/_query`, data)

