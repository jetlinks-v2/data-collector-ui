import { inject, onBeforeUnmount, ref, watch } from 'vue'
import { useSystemStore } from '@jetlinks-web-core/store'
import axios from 'axios'
import { getResourceLangFile } from '../api/data-collect/channel'

/** Resolve plugin translations beside the installed editor, with language fallback. */
export const useLocales = (namespace: string) => {
    const systemStore = useSystemStore()
    const form = inject<{ provider?: string }>('plugin-form', {})
    const langJson = ref<Record<string, string>>({})
    let revision = 0
    // The platform request interceptor appends a boolean success flag to raw JSON resources.
    const dictionary = (value: unknown): value is Record<string, string> => !!value && typeof value === 'object' && !Array.isArray(value) && Object.entries(value).every(([key, item]) => key === 'success' || typeof item === 'string')
    watch(() => [form.provider, systemStore.language], async () => {
        const identity = ++revision, provider = form.provider || namespace
        const language = systemStore.language || 'zh'
        const languages = [...new Set([language, language.split(/[-_]/)[0], 'en'])]
        for (const locale of languages) {
            try {
                const value = await getResourceLangFile(provider, locale)
                if (identity !== revision) return
                if (dictionary(value)) { langJson.value = value; return }
            } catch { /* Try the bundled resource or parent language. */ }
            try {
                const response = await axios.get(`/protocol/${namespace}/lang/${locale}.json`)
                if (identity !== revision) return
                if (dictionary(response.data)) { langJson.value = response.data; return }
            } catch { /* Try the next supported language. */ }
        }
        if (identity === revision) langJson.value = {}
    }, { immediate: true })
    onBeforeUnmount(() => { ++revision })
    return { $lang: (key: string) => langJson.value[key] || key }
}
