import {getResourceFile} from "../api/data-collect/channel";
import axios from "axios";

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
