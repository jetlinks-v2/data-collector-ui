<template>
  <Suspense v-if="myComponents">
    <component :is="myComponents" :value="value" @change="v => emit('change', v)" v-bind="props.props" ref="componentRef" @vue:mounted="handleMounted"></component>
  </Suspense>
</template>

<script setup name="TableRowRender">
import {loadModule} from 'vue3-sfc-loader/dist/vue3-sfc-loader'
import {defineAsyncComponent, ref, watch} from 'vue'
import * as Vue from 'vue'
import {debounce, isFunction} from 'lodash-es'
import * as JetlinksCore from '@jetlinks-web/core'
import * as JetlinksUtils from '@jetlinks-web/utils'
import * as JetlinksTypes from '@jetlinks-web/types'
import * as JetlinksConstants from '@jetlinks-web/constants'
import * as JetlinksHooks from '@jetlinks-web/hooks'
import * as pinia from 'pinia'
import * as Router from 'vue-router'
import * as LocalUtils from '@/utils'
import * as LodashEs from 'lodash-es'
import * as hooks from '@collector/hooks'
import {devGetProtocol} from "@collector/utils/utils";

defineOptions({name: 'RenderComponents'})


const props = defineProps({
  name: {
    type: String
  },
  value: {
    type: String
  },
  provider: {
    type: String
  },
  props: {
    type: Object
  }
})

const emit = defineEmits(['mounted', 'change'])
const app = inject('appInstance')
const myComponents = ref()

const render = debounce((value) => {
  const name = props.name()

  myComponents.value = defineAsyncComponent(() => loadModule('./components/PluginRender.vue', {
    moduleCache: {
      vue: Vue,
      '@jetlinks-web/core': JetlinksCore,
      '@jetlinks-web/utils': JetlinksUtils,
      '@jetlinks-web/types': JetlinksTypes,
      '@jetlinks-web/constants': JetlinksConstants,
      '@jetlinks-web/hooks': JetlinksHooks,
      pinia: pinia,
      'vue-router': Router,
      'local-utils': LocalUtils,
      'lodash-es': LodashEs,
      '@hooks': hooks
    },
    getFile(url) {
      return Promise.resolve(value)
    },
    addStyle(textContent) {
      const style = Object.assign(document.createElement('style'), {textContent});
      const ref = document.head.getElementsByTagName('style')[0] || null;
      document.head.insertBefore(style, ref);
    }
  }))

  app.component(name, myComponents.value)
}, 500)

const handleMounted = () => {
  emit('mounted')
}

watch(() => props.name, () => {
  if (isFunction(props.name)) {
    const name = props.name()
    const component = app.component(name);
    if (component) {
      myComponents.value = component
      return
    }
    devGetProtocol(props.provider, name).then(resp => {
      render(resp)
    })
  } else {
    myComponents.value = props.name
  }
}, {immediate: true})
</script>

<style scoped>

</style>
