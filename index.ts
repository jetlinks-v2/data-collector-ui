import { moduleRegistry } from '@jetlinks-web-core/utils/module-registry'
import i18n from "@jetlinks-web-core/locales";
import registerSetting from './register'
import { name } from './package.json'

const routerModules = import.meta.glob('./views/**/index.vue')

const getAsyncRoutesMap = () => {
    const modules:any = {}
    Object.keys(routerModules).forEach(item => {
        const code = item.replace('./views/', '').replace('/index.vue', '')
        const key = `${code}`
        modules[key] = routerModules[item]
    })

    return modules
}

const getExtraRoutesMap = () => {
    return {
        'edge/NewResource': {
            children: [
                {
                    code: 'Detail',
                    url: '/detail/:id',
                    name: i18n.global.t('data-collector-ui.index.237811-0'),
                    component: () => import('./views/edge/NewResource/Detail/index.vue')
                }
            ]
        }
    }
}

const register = () => {
    moduleRegistry.register(name, registerSetting)
}

export default {
    getAsyncRoutesMap,
    getExtraRoutesMap,
    register
}
