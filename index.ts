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
                    url: '/detail:id',
                    name: '详情信息',
                    component: () => import('./views/edge/NewResource/Detail/index.vue')
                }
            ]
        }
    }
}

export default {
    getAsyncRoutesMap,
    getExtraRoutesMap
}
