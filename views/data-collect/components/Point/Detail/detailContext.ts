import type { InjectionKey } from 'vue'
import type { CollectRecord } from '../../../hook/context'

export interface PointEditor {
  flush: () => Promise<boolean>
  isDirty: () => boolean
  discard?: () => void
}
export interface PointDetailPersistence {
  save: (patch: Partial<CollectRecord>) => Promise<boolean>
}
export const POINT_PERSISTENCE = Symbol('point-persistence') as InjectionKey<PointDetailPersistence>
