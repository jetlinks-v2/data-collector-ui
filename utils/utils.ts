import {getRemoteProxyUrl, getRemoteSystem, getRemoteToken} from "../api/edge/instance";
import {BASE_API} from "@jetlinks-web/constants";
import {getResourceFile} from "../api/data-collect/channel";
import axios from "axios";

export const openEdgeUrl = async (id: string) => {
    const resp = await getRemoteToken(id,
        {
            "expires": 7200000,
            "authentication": {
                "user": {
                    "id": "",
                    "username": "admin",
                    "name": "超级管理员",
                    "userType": "admin",
                    "type": "user"
                },
                "permissions": [
                    {
                        "id": "*",
                        "name": "*",
                        "actions": [
                            "*"
                        ],
                        "dataAccesses": []
                    }
                ],
                "dimensions": [
                    {
                        "id": "",
                        "username": "admin",
                        "name": "超级管理员",
                        "userType": "admin",
                        "type": "user"
                    }
                ],
                "attributes": {}
            }
        })

    if (resp.success) {
        const _location = window.location.origin + window.location.pathname
        const system = await getRemoteSystem(id, [ "paths" ])
        const path = system.result[0]?.properties['base-path']
        // const path = 'http://192.168.32.116:5173'
        const base64Url = btoa(path)
        const proxyUrl = await getRemoteProxyUrl(id)
        const fallbackBase64 = btoa(`${_location}#/edge/token/${id}`)
        const basePath = BASE_API?.replace('/', '') || ''

        const url = `${_location}${basePath}/edge/device:${id}/_proxy/${proxyUrl.result}/${fallbackBase64}/${base64Url}/#/?token=${resp.result}&thingId=${id}&terminal=cloud`

        window.open(url)
    }
}

export const devGetProtocol = async (protocol: string, module: string) => {
    try {
        const isDevelopment = import.meta.env.MODE === 'development'

        if (isDevelopment) {
            const resp = await axios.get(`/protocol/${protocol}/${module}.vue`)
            return resp.data
        } else {
            const resp = await getResourceFile(protocol, module).catch(async (e) => {
                if(e){
                    const resp = await axios.get(`/protocol/${protocol}/${module}.vue`)
                    return resp.data
                }
            })
            return resp
        }

    } catch (e) {
        return undefined
    }
}
