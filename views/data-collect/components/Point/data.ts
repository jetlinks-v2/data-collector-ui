import type { CollectRecord } from '../../hook/context'

export const isPointStopped = (item?: CollectRecord) =>
    item?.state?.value === 'disabled' ||
    (item?.effectiveRunningState ?? item?.runningState)?.value === 'stopped';

export const getAccessModes = (item?: CollectRecord) =>
    item?.accessModes?.map(mode => mode.value) ?? [];

