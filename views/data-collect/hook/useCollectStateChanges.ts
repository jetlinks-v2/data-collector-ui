import { onActivated, onDeactivated, onMounted, onScopeDispose } from 'vue'

export function useCollectStateChanges(reload: () => Promise<void>) {
  let channel: BroadcastChannel | undefined
  let active = true
  const refresh = () => { if (active) void reload() }
  const refreshOnReturn = () => { if (document.visibilityState === 'visible') refresh() }

  onMounted(() => {
    if (typeof BroadcastChannel === 'function') {
      channel = new BroadcastChannel('jetlinks-data-collect')
      channel.onmessage = refresh
    }
    document.addEventListener('visibilitychange', refreshOnReturn)
  })
  onActivated(() => { active = true })
  onDeactivated(() => { active = false })
  onScopeDispose(() => {
    channel?.close()
    channel = undefined
    document.removeEventListener('visibilitychange', refreshOnReturn)
  })

  // 只广播重新查询的信号，各标签页按自己的权限重新读取状态。
  return () => channel?.postMessage(null)
}
