import { useRequest } from '@jetlinks-web/hooks';
import { getProviders } from "@collector/api/data-collect/channel";
export const useProvider = () => {
  const { data } = useRequest(getProviders, {
    onSuccess: (res: any) => {
      return res.result.filter((item: any) => {
        return !['COLLECTOR_GATEWAY', 'MODBUS_RTU'].includes(item.id)
      })
    }
  })
  return {
    data
  }
}