import {LocalStore} from "@jetlinks-web/utils";

const pointTemplateProvider = 'Point-Template-Provider'

export const setPointTemplateProvider = (provider: string, dt: any) => {
    const obj = LocalStore.get(pointTemplateProvider) || {}
    obj[provider] = dt
    LocalStore.set(pointTemplateProvider, obj)
}

export const getPointTemplateProvider = (provider: string) => {
    const stored = LocalStore.get(pointTemplateProvider)
    return stored?.[provider]
}
