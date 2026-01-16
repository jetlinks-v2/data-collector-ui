import {LocalStore} from "@jetlinks-web/utils";

const collectorTemplateCode = 'Collector-Template'

export const setCollectorTemplate = (id: string, dt: any) => {
    const obj = LocalStore.get(collectorTemplateCode) || {}
    obj[id] = dt
    LocalStore.set(collectorTemplateCode, obj)
}

export const getCollectorTemplate = (id: string) => {
    const stored = LocalStore.get(collectorTemplateCode)
    return stored?.[id]
}
