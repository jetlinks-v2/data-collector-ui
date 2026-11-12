import type { RouteLocationResolved, Router } from 'vue-router'

/** 仅接受同一列表路由的返回地址，防止从复制链接跳出当前项目或模块。 */
export function pointReturnLocation(router: Pick<Router, 'resolve'>, list: RouteLocationResolved, returnTo: unknown) {
  if (typeof returnTo !== 'string' || !returnTo.startsWith('/') || returnTo.startsWith('//')) return list.fullPath
  try {
    const target = router.resolve(returnTo)
    return target.path === list.path ? target.fullPath : list.fullPath
  } catch { return list.fullPath }
}
