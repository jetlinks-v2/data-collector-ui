import { nextTick, onBeforeUnmount, onMounted, ref, watch, type CSSProperties, type Ref } from 'vue'
import { theme } from 'ant-design-vue'

interface Options {
  key: Readonly<Ref<string | undefined>>
  anchor: () => HTMLElement | undefined
  viewport: () => HTMLElement | undefined
  width: Readonly<Ref<number>>
  onSource: Readonly<Ref<boolean>>
  ready: Readonly<Ref<boolean>>
  panelWidth: (rect: DOMRect) => number
  alignment?: { source: () => Element | null | undefined; panel: () => Element | null | undefined }
  sourceStyle?: (source: HTMLElement) => CSSProperties
  focus?: () => HTMLElement | null | undefined
}

/** Point and object editors share viewport geometry and one RAF per scroll frame. */
export function useEditorOverlay(options: Options) {
  const { token } = theme.useToken()
  const { key, anchor, viewport: measureViewport, width, onSource, ready } = options
  const open = ref(false), placement = ref<'bottomLeft' | 'topLeft'>('bottomLeft')
  const position = ref<CSSProperties>({}), anchorStyle = ref<CSSProperties>({}), target = ref<HTMLElement>()
  let frame = 0, observer: ResizeObserver | undefined
  function observeSource() {
    observer?.disconnect()
    if (!key.value) return
    for (const element of new Set([anchor(), measureViewport()])) if (element) observer?.observe(element)
  }
  function locate(reveal = true) {
    frame = 0
    const source = anchor(), rect = source?.getBoundingClientRect(), viewport = measureViewport()?.getBoundingClientRect()
    if (!key.value || reveal && !ready.value || !rect || !viewport || rect.bottom <= Math.max(0, viewport.top) || rect.top >= Math.min(window.innerHeight, viewport.bottom) || rect.right <= viewport.left || rect.left >= viewport.right) { open.value = false; return }
    let panelWidth = Math.min(options.panelWidth(rect), window.innerWidth - 24)
    let left = Math.max(12, viewport.left, Math.min(rect.left, viewport.right - panelWidth, window.innerWidth - panelWidth - 12))
    const below = Math.max(0, window.innerHeight - rect.bottom - 20), above = Math.max(0, rect.top - 20)
    const down = below >= 200 || below >= above
    placement.value = onSource.value || down ? 'bottomLeft' : 'topLeft'
    anchorStyle.value = { position: 'fixed', left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px', pointerEvents: 'none', visibility: 'hidden' }
    let top = Math.max(12, viewport.top, rect.top)
    const sourceIcon = options.alignment?.source()?.getBoundingClientRect(), panelIcon = options.alignment?.panel()?.getBoundingClientRect(), panel = target.value?.getBoundingClientRect()
    if (onSource.value && sourceIcon && panelIcon && panel) {
      left = Math.max(12, sourceIcon.left - (panelIcon.left - panel.left))
      panelWidth = Math.min(panelWidth, viewport.right - left, window.innerWidth - left - 12)
      top = Math.max(12, sourceIcon.top - (panelIcon.top - panel.top))
    }
    position.value = {
      ...(source ? options.sourceStyle?.(source) : undefined),
      // Editing extends the page; native popovers, drawer masks and dialogs stay above it.
      zIndex: token.value.zIndexPopupBase - 1,
      width: panelWidth + 'px', '--cw-source-height': Math.max(rect.height, rect.bottom - top) + 'px', '--cw-panel-left': left + 'px',
      '--cw-panel-top': onSource.value ? top + 'px' : down ? Math.max(12, rect.bottom + 8) + 'px' : 'auto',
      '--cw-panel-bottom': onSource.value || down ? 'auto' : Math.max(12, window.innerHeight - rect.top + 8) + 'px',
      '--cw-panel-height': Math.min(640, onSource.value ? window.innerHeight - top - 12 : down ? below : above) + 'px',
      '--cw-panel-anchor': Math.max(16, Math.min(panelWidth - 16, (rect.left + rect.right) / 2 - left)) + 'px',
    }
    if (reveal) open.value = true
  }
  function update(event?: Event) {
    if (event?.target instanceof Node && target.value?.contains(event.target)) return
    if (key.value && ready.value && !frame) frame = requestAnimationFrame(() => locate())
  }
  watch([key, width, onSource, ready, target, () => token.value.zIndexPopupBase], async () => {
    observeSource()
    if (!key.value || !ready.value) { cancelAnimationFrame(frame); frame = 0; open.value = false }
    if (!key.value) return
    await nextTick(); locate(false)
    await nextTick(); update()
  }, { flush: 'post' })
  watch(open, async visible => { if(visible && options.focus) { await nextTick(); if(open.value)options.focus()?.focus({preventScroll:true}) } })
  onMounted(() => { observer = new ResizeObserver(() => update()); observeSource(); document.addEventListener('scroll', update, { capture: true, passive: true }); window.addEventListener('resize', update); update() })
  onBeforeUnmount(() => { observer?.disconnect(); cancelAnimationFrame(frame); document.removeEventListener('scroll', update, true); window.removeEventListener('resize', update) })
  // FullPage creates a containing block; body portals keep the viewport origin consistent.
  return { open, placement, position, anchorStyle, target, popupContainer: () => document.body, update }
}
