import { onBeforeUnmount, onDeactivated, onActivated, ref, shallowRef, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { observeRuntime, observeLatestRecording } from '../../../api/data-collect/workspace'
import { loadRuntimeMetricMetadata } from './useRuntimeMetricMetadata'
import { observedRuntime } from '../../../utils/workspaceObservation'
import type { CollectorObject, CollectorObservation, EntityKind, MetricDefinition, RuntimeSnapshot, RecordingSnapshot } from '../../../types/workspace'

/** 指标优先复用页面实时流；浮层只按需读取完整回放，不控制采集器录制策略。 */
export function useWorkspaceRuntime(collector:Ref<CollectorObject|undefined>,paused:Ref<boolean>,observation:Ref<CollectorObservation|undefined>) {
  const {t,locale}=useI18n()
  const snapshot=shallowRef<RuntimeSnapshot>(),recording=shallowRef<RecordingSnapshot>()
  const definitions=shallowRef<MetricDefinition[]>([]),error=ref(''),loading=ref(false)
  const target=ref<{kind:EntityKind;id:string}>(),open=ref(false)
  let subscription:{unsubscribe():void}|undefined,recordingSubscription:{unsubscribe():void}|undefined
  let revision=0,recordingRevision=0,active=true
  function cancelRecording() { ++recordingRevision;recordingSubscription?.unsubscribe();recordingSubscription=undefined }
  function cancel() { ++revision;subscription?.unsubscribe();subscription=undefined;cancelRecording();loading.value=false }
  function connectRecording() {
    cancelRecording()
    const id=collector.value?.id,serverId=snapshot.value?.serverId
    if(!active || !open.value || paused.value || document.hidden || !id || !serverId || !snapshot.value?.available || target.value?.kind === 'channel')return
    const token=recordingRevision
    recordingSubscription=observeLatestRecording(id,serverId).subscribe({
      next:value=>{if(token === recordingRevision)recording.value=value},
      error:cause=>{if(token === recordingRevision)error.value=cause instanceof Error ? cause.message : String(cause)},
    })
  }
  function accept(value:RuntimeSnapshot) {
    const changed=snapshot.value?.serverId !== value.serverId || snapshot.value?.available !== value.available
    snapshot.value=value;loading.value=false
    if(changed)recording.value=undefined
    if(changed || !recordingSubscription)connectRecording()
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
    const shared=observedRuntime(observation.value,current.kind,current.id)
    if(shared){accept(shared);return}
    subscription=observeRuntime(current.kind,current.id).subscribe({
      next:value=>{if(token === revision)accept(value)},
      error:cause=>{if(token === revision){error.value=cause instanceof Error ? cause.message : String(cause);loading.value=false}},
      complete:()=>{if(token === revision){loading.value=false;error.value=t('collectorWorkspace.streamEnded')}},
    })
  }
  function inspect(kind:EntityKind,id:string) {
    if(target.value?.kind === kind && target.value.id === id && open.value)return
    snapshot.value=undefined;recording.value=undefined;target.value={kind,id};open.value=true
  }
  function close(){open.value=false;cancel()}
  watch([target,open,paused,locale],connect)
  watch(observation,value=>{
    if(!open.value || !target.value || paused.value || !active || document.hidden)return
    const shared=observedRuntime(value,target.value.kind,target.value.id)
    if(shared){subscription?.unsubscribe();subscription=undefined;accept(shared)}
  })
  watch(()=>collector.value?.id,()=>{close();recording.value=undefined;snapshot.value=undefined})
  const visibility=()=>{if(document.hidden)cancel();else connect()}
  document.addEventListener('visibilitychange',visibility)
  onDeactivated(()=>{active=false;cancel()})
  onActivated(()=>{if(!active){active=true;connect()}})
  onBeforeUnmount(()=>{cancel();document.removeEventListener('visibilitychange',visibility)})
  return {snapshot,recording,definitions,error,loading,open,target,inspect,close}
}
