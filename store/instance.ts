import { DeviceInstance } from "../views/edge/Batch/instance"
import { defineStore } from "pinia"
import { detail } from '../api/others'

export const useInstanceStore = defineStore({
  id: 'device',
  state: () => ({
    current: {} as DeviceInstance,
    detail: {} as DeviceInstance,
    tabActiveKey: 'Info'
  }),
  actions: {
    setCurrent(current: DeviceInstance) {
      this.current = current
      this.detail = current
    },
    async refresh(id: string) {
      const resp: any = await detail(id)
      if(resp.status === 200){
        this.current = resp.result
        this.detail = resp.result
      }
    },
    setTabActiveKey(key: string) {
      this.tabActiveKey = key
    },
  }
})
