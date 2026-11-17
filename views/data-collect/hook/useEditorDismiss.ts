import { computed, nextTick, ref, type Ref } from 'vue'
import { onClickOutside, useEventListener } from '@vueuse/core'

// Plugin controls may teleport their menus, dialogs and formula keyboard to body.
const popups = '.ant-select-dropdown,.ant-picker-dropdown,.ant-cascader-menus,.ant-dropdown,.ant-popover,.ant-modal,.ant-drawer-content,.ML__keyboard,.ML__popover'
// Opening a popup is also part of that interaction, before its teleported surface exists.
const popupInteractions = `${popups},.ant-tooltip,.ant-modal-root,.ant-drawer,[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"],[role="tooltip"],[aria-haspopup],[aria-expanded]`

/** Dismiss the edit surface, leaving draft and saving policy with its owner. */
export function useEditorDismiss(options: {
  active: Readonly<Ref<boolean>>
  panel: Ref<HTMLElement | undefined>
  anchor: () => HTMLElement | undefined
  trigger?: () => HTMLElement | undefined
  dismiss: (restoreFocus: boolean) => void
}) {
  const anchor = computed(options.anchor), trigger = computed(() => options.trigger?.())
  onClickOutside(options.panel, event => {
    // Some popup controls stop pointerdown; check the click path as well as VueUse's pointer origin.
    const popup = event.composedPath().some(node => node instanceof Element && node.matches(popupInteractions))
    if (options.active.value && !popup) options.dismiss(false)
  }, { ignore: [anchor, trigger, popupInteractions] })

  useEventListener(document, 'keydown', event => {
    if (event.key !== 'Escape' || !options.active.value || event.defaultPrevented || event.isComposing) return
    const panel = options.panel.value
    // Inspect before a selector closes itself, so the first Escape only closes its menu.
    const expanded = Array.from(document.querySelectorAll('[aria-expanded="true"][aria-controls]'))
    const nestedPopup = Array.from(document.querySelectorAll<HTMLElement>(popups)).some(element => {
      const style = getComputedStyle(element)
      if (element.contains(panel || null) || !element.getClientRects().length || style.visibility === 'hidden' || style.pointerEvents === 'none') return false
      const list = element.matches('.ant-select-dropdown') && element.querySelector('[role="listbox"][id]')
      // A menu can remain painted during its exit animation after the selector has closed.
      return !list || expanded.some(control => control.getAttribute('aria-controls')?.split(/\s+/).includes(list.id))
    })
    if (nestedPopup) return
    event.preventDefault(); event.stopPropagation(); options.dismiss(true)
  }, { capture: true })
}

/** Click popovers need an explicit Escape owner; the surrounding editor stays open. */
export function useEditorPopover() {
  const open = ref(false), trigger = ref<HTMLElement>()
  function close() {
    open.value = false
    void nextTick(() => trigger.value?.querySelector('button')?.focus({ preventScroll: true }))
  }
  return { open, trigger, close }
}
