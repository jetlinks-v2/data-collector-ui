import { shallowRef, watch } from 'vue'
import { updateMetricTrends, type MetricNode, type MetricTrends } from '../../../utils/runtimeMetricVisuals'

/** 详情与组件同生命周期，只消费已有采样，不另订阅或创建计时器。 */
export function useMetricTrends(nodes: () => MetricNode[]) {
  const trends = shallowRef<MetricTrends>(new Map())
  watch(nodes, value => { trends.value = updateMetricTrends(trends.value, value) }, { immediate: true })
  return trends
}
