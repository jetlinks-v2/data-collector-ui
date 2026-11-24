import { onBeforeUnmount, ref, watch, type CSSProperties, type Ref } from 'vue'

/** Hover previews stay at their opening position; click pins them until dismissal. */
export function useHoverPanel(open: Ref<boolean>, setOpen: (visible: boolean) => void, options: { width?: number; height?: number; align?: 'left' | 'right' } = {}) {
  const pinned = ref(false), trigger = ref<HTMLElement>(), panel = ref<HTMLElement>()
  const position = ref<CSSProperties>({}), side = ref<'top' | 'bottom'>('bottom')
  let restoringFocus = false
  function locate() {
    const rect = trigger.value?.getBoundingClientRect()
    if (!rect) return
    const width = Math.min(options.width || 444, window.innerWidth - 24), height = Math.min(options.height || 560, window.innerHeight - 24)
    const left = Math.max(12, Math.min(options.align === 'left' ? rect.left : rect.right - width, window.innerWidth - width - 12))
    // Anchor the nearest edge rather than reserving the full possible panel height.
    // Short previews stay attached; longer content scrolls within the available space.
    const below = Math.max(0, window.innerHeight - rect.bottom - 20), above = Math.max(0, rect.top - 20)
    const down = below >= Math.min(height, 160) || below >= above
    side.value = down ? 'bottom' : 'top'
    position.value = {
      '--cw-panel-left': `${left}px`,
      '--cw-panel-top': down ? `${Math.max(12, rect.bottom + 8)}px` : 'auto',
      '--cw-panel-bottom': down ? 'auto' : `${Math.max(12, window.innerHeight - rect.top + 8)}px`,
      '--cw-panel-height': `${Math.min(height, down ? below : above)}px`,
      '--cw-panel-anchor': `${Math.max(16, Math.min(width - 16, (rect.left + rect.right) / 2 - left))}px`,
    }
  }
  function onVisibility(visible: boolean) { if (!pinned.value && !restoringFocus) setOpen(visible) }
  function toggle() { pinned.value = !pinned.value; setOpen(pinned.value) }
  function close() { pinned.value = false; setOpen(false) }
  function outside(event: PointerEvent) {
    if (event.target instanceof Node && !trigger.value?.contains(event.target) && !panel.value?.contains(event.target)) close()
  }
  function escape(event: KeyboardEvent) {
    if (event.key !== 'Escape') return
    close()
    const target = trigger.value?.matches('button,[tabindex]') ? trigger.value : trigger.value?.querySelector<HTMLElement>('button,[tabindex]')
    restoringFocus = true
    target?.focus({ preventScroll: true })
    restoringFocus = false
  }
  function detach() {
    window.removeEventListener('resize', locate); document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape)
  }
  watch(open, value => {
    detach()
    if (!value) { pinned.value = false; return }
    locate(); window.addEventListener('resize', locate); document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape)
  }, { flush: 'sync' })
  onBeforeUnmount(detach)
  return { trigger, panel, position, side, onVisibility, toggle }
}
