import type { ComputedRef, InjectionKey, Ref } from 'vue'

export interface PointBatchSaveContext {
  saving: Ref<boolean>
  ready: ComputedRef<boolean>
  hasTable: Ref<boolean>
  save: () => Promise<void>
}

// 协议只提供新增动作；页面保留保存、导航及提交状态的所有权。
export const pointBatchSaveKey: InjectionKey<PointBatchSaveContext> = Symbol('point-batch-save')
