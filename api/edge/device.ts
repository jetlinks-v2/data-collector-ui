import { request } from '@jetlinks-web/core'

export const restPassword = (id: string) => request.post(`/edge/operations/${id}/auth-user-password-reset/invoke`)

export const _control = (deviceId: string) => request.get(`/edge/remote/${deviceId}/url`)

export const _stopControl = (deviceId: string) => request.post(`/edge/remote/${deviceId}/stop`)


