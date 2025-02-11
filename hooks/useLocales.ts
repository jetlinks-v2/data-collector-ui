import {useSystemStore} from "@/store";
import axios from "axios";
import {getResourceLangFile} from "../api/data-collect/channel";

export const useLocales = (protocol: string) => {
    const systemStore = useSystemStore()
    const langJson = ref({})

    const getLangJsonFile = async (_protocol: string, language: string) => {
        try {
            const isDevelopment = import.meta.env.MODE === 'development'

            if (isDevelopment) {
                const resp = await axios.get(`/protocol/${_protocol}/lang/${language}.json`)
                langJson.value = resp.data
            } else {
                const resp: any = await getResourceLangFile(_protocol, language).catch(async (e) => {
                    if(e){
                        const resp = await axios.get(`/protocol/${_protocol}/lang/${language}.json`)
                        langJson.value = resp.data
                    }
                })
                langJson.value = resp
            }

        } catch (e) {
            langJson.value = {}
        }
    }

    const $lang = (key: string) => {
        return langJson.value?.[key] || ''
    }

    watch(
        () => [protocol, systemStore.language],
        () => {
            getLangJsonFile(protocol, systemStore.language || 'ch')
        }, {
            deep: true,
            immediate: true,
        }
    )

    return {
        $lang
    }
}
