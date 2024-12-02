import { request } from '@jetlinks-web/core'

export const restPassword = (id: string) => request.post(`/edge/operations/${id}/auth-user-password-reset/invoke`)

export const _control = (deviceId: string) => request.get(`/edge/remote/${deviceId}/url`)

export const _stopControl = (deviceId: string) => request.post(`/edge/remote/${deviceId}/stop`)

export const getRemoteProxyUrl = (deviceId: string) => request.post(`/edge/device/${deviceId}/_proxy/_start?timeoutMinute=10`)

export const getRemoteToken = (deviceId: string) => request.post(`/edge/device/${deviceId}/token`)

export const getRemoteSystem = (deviceId: string, data: any) => request.post(`/edge/device/${deviceId}/_/system/config/scopes`, data)
