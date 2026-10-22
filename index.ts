import {moduleRegistry} from '@jetlinks-web-core/utils/module-registry'
import i18n from "@jetlinks-web-core/locales";
import registerSetting from './register'
import {name} from './package.json'

const routerModules = import.meta.glob('./views/**/index.vue')

const getAsyncRoutesMap = () => {
    const modules: any = {}
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
        },
        'data-collect': {
            children: [
                {
                    code: 'BatchAdd',
                    url: '/batch-add/:id',
                    name: i18n.global.t('DataCollect.index.400152-13'),
                    component: () => import('./views/data-collect/components/Point/BatchSave/index.vue')
                },
                {
                    code: 'Scan',
                    url: '/scan/:id',
                    name: i18n.global.t('data-collector-ui.index.237811-1'),
                    component: () => import('./views/data-collect/components/Point/Scan/Page.vue')
                }
            ]
        }
    }
}

const register = () => {
    moduleRegistry.register(name, registerSetting)
}

// 点位新增与扫描页共用连续白底面板，避免壳层重复叠加一层内边距。
const getContentPanelOverrides = () => ({
    'data-collect/BatchAdd': false,
    '/resources/collectors/batch-add/:id': false,
    'data-collect/Scan': false,
    '/resources/collectors/scan/:id': false,
})

export default {
    getAsyncRoutesMap,
    getExtraRoutesMap,
    getContentPanelOverrides,
    register,
    priority: -100
}
