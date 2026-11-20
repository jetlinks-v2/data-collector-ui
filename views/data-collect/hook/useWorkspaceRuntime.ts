import { computed, onBeforeUnmount, onDeactivated, onActivated, ref, shallowRef, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { observeRuntime } from '../../../api/data-collect/workspace'
import { loadRuntimeMetricMetadata } from './useRuntimeMetricMetadata'
import { observedRuntime } from '../../../utils/workspaceObservation'
import { pointRecording } from '../../../utils/runtimePresentation'
import type { CollectorObject, CollectorObservation, EntityKind, MetricDefinition, RuntimeSnapshot, RecordingSnapshot, WorkspaceRecordingTarget } from '../../../types/workspace'

/** 指标优先复用页面实时流；浮层只按需读取完整回放，不控制采集器录制策略。 */
export function useWorkspaceRuntime(collector:Ref<CollectorObject|undefined>,paused:Ref<boolean>,observation:Ref<CollectorObservation|undefined>,sharedRecording:Ref<RecordingSnapshot|undefined>,recordingTarget:Ref<WorkspaceRecordingTarget|undefined>,summaries:{collectors:Ref<CollectorObject[]>;channels:Ref<CollectorObject[]>}) {
  const {t,locale}=useI18n()
  const snapshot=shallowRef<RuntimeSnapshot>(),recording=shallowRef<RecordingSnapshot>()
  const definitions=shallowRef<MetricDefinition[]>([]),error=ref(''),loading=ref(false)
  const target=ref<{kind:EntityKind;id:string}>(),open=ref(false)
  const sharedSnapshot=computed(()=>{
    const current=target.value
    if(!current)return
    if(current.kind === 'point')return observedRuntime(observation.value,current.kind,current.id)
    const objects=current.kind === 'channel' ? summaries.channels.value : summaries.collectors.value
    return objects.find(object=>object.id === current.id)?.runtime
  })
  let subscription:{unsubscribe():void}|undefined
  let revision=0,active=true
  function cancelRecording() { if(recordingTarget.value)recordingTarget.value=undefined }
  function cancel() { ++revision;subscription?.unsubscribe();subscription=undefined;cancelRecording();loading.value=false }
  function connectRecording() {
    const id=collector.value?.id,serverId=snapshot.value?.serverId
    if(!active || !open.value || paused.value || document.hidden || !id || !serverId || !snapshot.value?.available || target.value?.kind === 'channel'){cancelRecording();return}
    if(recordingTarget.value?.collectorId !== id || recordingTarget.value.serverId !== serverId)recordingTarget.value={collectorId:id,serverId,interval:1000}
  }
  function accept(value:RuntimeSnapshot) {
    const changed=snapshot.value?.serverId !== value.serverId || snapshot.value?.available !== value.available
    snapshot.value=value;loading.value=false;error.value=''
    if(changed)recording.value=undefined
    connectRecording()
  }
  function connect() {
    cancel()
    const current=target.value
    if(!active || !current || !open.value || paused.value || document.hidden)return
    const token=revision
    loading.value=true;error.value='';definitions.value=[]
    loadRuntimeMetricMetadata(current.kind,locale.value).then(properties=>{
      if(token === revision)definitions.value=properties
    }).catch(()=>{/* 定义暂不可用时仍显示原始指标标识。 */})
    const shared=sharedSnapshot.value
    if(shared){accept(shared);return}
    // 当前可见范围没有此对象时只补一次，不另建第二条常驻连接。
    subscription=observeRuntime(current.kind,current.id,0).subscribe({
      next:value=>{if(token === revision)accept(value)},
      error:cause=>{if(token === revision){error.value=cause instanceof Error ? cause.message : String(cause);loading.value=false}},
      complete:()=>{if(token === revision)loading.value=false},
    })
  }
  function inspect(kind:EntityKind,id:string) {
    if(target.value?.kind === kind && target.value.id === id && open.value)return
    snapshot.value=undefined;recording.value=undefined;target.value={kind,id};open.value=true
  }
  function close(){open.value=false;cancel()}
  watch([target,open,paused,locale],connect)
  watch(sharedRecording,value=>{
    if(open.value && value && value.collectorId === collector.value?.id && value.serverId === snapshot.value?.serverId){recording.value=value;error.value=''}
  })
  watch(sharedSnapshot,shared=>{
    if(!open.value || !target.value || paused.value || !active || document.hidden)return
    if(shared){subscription?.unsubscribe();subscription=undefined;accept(shared)}
  })
  watch(()=>collector.value?.id,()=>{close();recording.value=undefined;snapshot.value=undefined})
  const visibility=()=>{if(document.hidden)cancel();else connect()}
  document.addEventListener('visibilitychange',visibility)
  onDeactivated(()=>{active=false;cancel()})
  onActivated(()=>{if(!active){active=true;connect()}})
  onBeforeUnmount(()=>{cancel();document.removeEventListener('visibilitychange',visibility)})
  const scopedRecording=computed(()=>target.value?.kind === 'point' ? pointRecording(recording.value,target.value.id) : recording.value)
  return {snapshot,recording:scopedRecording,definitions,error,loading,open,target,inspect,close}
}
