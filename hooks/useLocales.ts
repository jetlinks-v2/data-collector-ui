import { computed, inject, onBeforeUnmount, ref, unref, watch, type MaybeRef } from 'vue'
import { useSystemStore } from '@jetlinks-web-core/store'
import axios from 'axios'
import { getResourceLangFile } from '../api/data-collect/channel'
import { useI18n } from 'vue-i18n'

type Messages = Record<string, string>

// Raw resource responses may carry the host interceptor's boolean success flag.
function dictionary(value: unknown): Messages | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return
    const entries = Object.entries(value)
    if (entries.some(([key, item]) => typeof item !== 'string' && !(key === 'success' && item === true))) return
    const messages = Object.fromEntries(entries.filter(([, item]) => typeof item === 'string'))
    return Object.keys(messages).length ? messages : undefined
}

/** Resolve plugin translations beside the installed editor, with language fallback. */
export const useLocales = (namespace: string) => {
    const systemStore = useSystemStore()
    const { rt } = useI18n({ useScope: 'global' })
    const form = inject<MaybeRef<{ provider?: string }>>('plugin-form', {})
    const collector = inject<MaybeRef<{ provider?: string }>>('collector-data', {})
    const provider = computed(() => unref(form)?.provider || unref(collector)?.provider || namespace)
    const langJson = ref<Messages>({})
    let revision = 0
    watch([provider, () => systemStore.language], async () => {
        const identity = ++revision
        const currentProvider = provider.value
        const language = systemStore.language || 'zh'
        const languages = [...new Set([language, language.split(/[-_]/)[0], 'en'])]
        langJson.value = {}
        const load = (read: (locale: string) => Promise<unknown>) => Promise.all(languages.map(async locale => {
            try { return dictionary(await read(locale)) }
            catch { return undefined }
        }))
        let catalogs = await load(locale => getResourceLangFile(currentProvider, locale))
        if (identity !== revision) return
        // An installed plugin owns its entire fallback chain; bundled files may be a different version.
        if (!catalogs.some(Boolean)) {
            catalogs = await load(async locale => (await axios.get(`/protocol/${namespace}/lang/${locale}.json`)).data)
        }
        if (identity === revision) langJson.value = Object.assign({}, ...catalogs.reverse().filter(Boolean))
    }, { immediate: true })
    onBeforeUnmount(() => { ++revision })
    return { $lang: (key: string, params?: Record<string, unknown>) => {
        const message = langJson.value[key] ?? key
        return params ? rt(message, params) : message
    } }
}
