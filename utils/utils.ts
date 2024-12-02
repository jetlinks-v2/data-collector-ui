import { getRemoteProxyUrl, getRemoteToken, getRemoteSystem} from '../api/edge/device';
import { BASE_API } from "@jetlinks-web/constants";

export const openEdgeUrl = async (id: string) => {
    const resp = await getRemoteToken(id)

    if (resp.success) {
        const _location = window.location.origin + window.location.pathname
        const system = await getRemoteSystem(id, [ "paths" ])
        const path = system.result[0]?.properties['base-path']
        const base64Url = btoa(path)
        const proxyUrl = await getRemoteProxyUrl(id)
        const fallbackBase64 = btoa(`${_location}#/edge/token/${id}`)
        const basePath = BASE_API?.replace('/', '') || ''

        const url = `${_location}${basePath}/edge/device:${id}/_proxy/${proxyUrl.result}/${fallbackBase64}/${base64Url}/#/?token=${resp.result}&terminal=cloud`

        window.open(url)
    }
}