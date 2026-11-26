import { stateValue } from '../types/workspace'
import type { CollectorObject } from '../types/workspace'

export const pointStorageFeatures: readonly string[] = ['storageData', 'storageOutlier', 'storageDeadband']
export const hasPointHistoryStorage = (point: Pick<CollectorObject, 'features'>): boolean => (point.features || []).map(stateValue).some(value => pointStorageFeatures.includes(value))
