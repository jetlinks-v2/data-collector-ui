import {getProviders} from "@data-collector-ui/api/data-collect/channel";

export const useCollectorProvider = (permissionKey: string) => {
    const providers = ref([]);
    // 需要判断是边端还是云端,边端没得COLLECTOR_GATEWAY     virtual
    getProviders().then((res) => {
        const _filter = [];
        if(permissionKey === 'data-collect/channel'){
            _filter.push('COLLECTOR_GATEWAY');
        } else {
            _filter.push('virtual');
        }
        providers.value = res.result.filter((item: any) => !_filter.includes(item.id)).map((item: any) => {
            return {
                ...item,
                label: item.name,
                value: item.id,
            };
        })
    });
    return {
        providers,
    };
}
