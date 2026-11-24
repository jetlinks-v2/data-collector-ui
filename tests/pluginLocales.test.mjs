import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'
import * as vue from 'vue'
import { createI18n } from 'vue-i18n'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)

const settle = async () => { await new Promise(resolve => setImmediate(resolve)); await vue.nextTick() }
function fixture(installed, bundled = async () => { throw new Error('missing') }) {
    const calls = [], store = vue.reactive({ language: 'ja-JP' }), form = vue.ref({ provider: 'installed' })
    const i18n = createI18n({ legacy: false, locale: 'en' })
    const mocks = {
        vue: { ...vue, inject: key => key === 'plugin-form' ? form : {}, onBeforeUnmount: vue.onScopeDispose },
        '@jetlinks-web-core/store': { useSystemStore: () => store },
        'vue-i18n': { useI18n: () => i18n.global },
        '../api/data-collect/channel': { getResourceLangFile: (provider, locale) => { calls.push(['installed', provider, locale]); return installed(provider, locale) } },
        axios: { get: async url => { calls.push(['bundled', url]); return { data: await bundled(url) } } },
    }
    const module = { exports: {} }
    new Function('require', 'module', 'exports', transformSync(readFileSync(new URL('../hooks/useLocales.ts', import.meta.url), 'utf8'), { loader: 'ts', format: 'cjs' }).code)(id => mocks[id], module, module.exports)
    const scope = vue.effectScope(), locales = scope.run(() => module.exports.useLocales('test'))
    return { ...locales, calls, store, form, scope }
}

test('merges requested, base and English keys reactively using vue-i18n parameters', async () => {
    const catalogs = { 'ja-JP': { title: '地域' }, ja: { title: '基本', hint: '説明' }, en: { title: 'Title', count: 'From {min} to {max}', success: true } }
    const f = fixture(async (_, locale) => catalogs[locale])
    try {
        const title = vue.computed(() => f.$lang('title'))
        assert.equal(title.value, 'title')
        await settle()
        assert.equal(title.value, '地域')
        assert.equal(f.$lang('hint'), '説明')
        assert.equal(f.$lang('count', { min: 1, max: 5 }), 'From 1 to 5')
        assert.equal(f.$lang('success'), 'success')
        assert.equal(f.$lang('unknown'), 'unknown')
        assert.equal(f.calls.filter(call => call[0] === 'bundled').length, 0)
    } finally { f.scope.stop() }
})

test('installed JSON files translate through the real shared Axios response interceptor', async () => {
    const lodash = await import('lodash-es')
    const load = (filename, mocks) => {
        const module = { exports: {} }
        new Function('require', 'module', 'exports', 'window', 'localStorage', transformSync(readFileSync(filename, 'utf8'), { loader: 'ts', format: 'cjs' }).code)(
            id => id in mocks ? mocks[id] : require(id), module, module.exports, {}, { getItem: () => null },
        )
        return module.exports
    }
    const sharedRoot = dirname(require.resolve('@jetlinks-web/core/package.json'))
    const { AxiosService } = load(join(sharedRoot, 'src/axios.ts'), {
        '@jetlinks-web/constants': { BASE_API: '/api', TOKEN_KEY: 'token', LOCAL_BASE_API: 'local-base-api' },
        '@jetlinks-web/utils': { getToken: () => undefined },
        'lodash-es': lodash,
    })
    const service = new AxiosService({ filter_url: ['/data-collect/'] })
    const catalogs = { 'ja-JP': { title: '地域' }, ja: { hint: '説明' }, en: { count: 'From {min} to {max}' } }
    service.getInstance().defaults.adapter = async config => ({
        data: config.url.endsWith('/providers') ? '{"status":200,"result":[]}' :
            config.url.includes('/broken/') ? 'invalid JSON' : config.url.endsWith('.vue') ? '<template>Editor</template>' :
                JSON.stringify(catalogs[config.url.split('/').pop().replace('.json', '')] || {}),
        status: 200, statusText: 'OK', headers: { 'content-type': 'application/json' }, config,
    })
    const api = load(new URL('../api/data-collect/channel.ts', import.meta.url), {
        '@jetlinks-web-core/utils': { getBaseApi: () => '/api' },
        '@jetlinks-web/core': { request: service },
    })
    assert.deepEqual(await api.getResourceLangFile('installed', 'ja-JP'), catalogs['ja-JP'])
    assert.deepEqual(JSON.parse(await api.getResourceModule('/data-collect/installed/resource/_/script/lang/ja-JP.json')), catalogs['ja-JP'])
    assert.equal(await api.getResourceModule('/data-collect/installed/resource/_/script/Editor.vue'), '<template>Editor</template>')
    const f = fixture((provider, locale) => api.getResourceLangFile(provider, locale))
    try {
        await settle()
        assert.equal(f.$lang('title'), '地域')
        assert.equal(f.$lang('hint'), '説明')
        assert.equal(f.$lang('count', { min: 1, max: 5 }), 'From 1 to 5')
        assert.equal(f.calls.filter(call => call[0] === 'bundled').length, 0)
        assert.deepEqual(await api.getProviders(), { status: 200, result: [], success: true })
        await assert.rejects(api.getResourceLangFile('broken', 'en'), SyntaxError)
    } finally { f.scope.stop() }
})

test('only falls back to bundled catalogs when all installed catalogs are unavailable or malformed', async () => {
    const f = fixture(async (_, locale) => locale === 'en' ? { success: false, message: 'missing' } : [], async url => url.endsWith('/en.json') ? { label: 'Bundled' } : {})
    try { await settle(); assert.equal(f.$lang('label'), 'Bundled'); assert.equal(f.calls.length, 6) } finally { f.scope.stop() }
    const installed = fixture(async (_, locale) => locale === 'en' ? { installed: 'Installed' } : {}, async () => ({ label: 'Wrong version' }))
    try { await settle(); assert.equal(installed.$lang('label'), 'label'); assert.equal(installed.calls.length, 3) } finally { installed.scope.stop() }
})

test('late provider or language requests and disposed scopes cannot replace current messages', async () => {
    const pending = []
    const f = fixture((provider, locale) => new Promise(resolve => pending.push({ provider, locale, resolve })))
    f.store.language = 'en'; f.form.value = { provider: 'second' }; await vue.nextTick()
    pending.find(item => item.provider === 'second').resolve({ label: 'Current' }); await settle()
    for (const item of pending.filter(item => item.provider === 'installed')) item.resolve({ label: 'Stale' })
    await settle(); assert.equal(f.$lang('label'), 'Current')
    f.store.language = 'zh'; await vue.nextTick(); f.scope.stop()
    for (const item of pending.filter(item => item.provider === 'second' && item.locale === 'zh')) item.resolve({ label: 'Disposed' })
    await settle(); assert.equal(f.$lang('label'), 'label')
})
