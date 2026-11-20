import type { Ref } from 'vue'
import { useEditorOverlay } from './useEditorOverlay'

/** Cards edit on their own surface; table rows use the same editor below the row. */
export function usePointEditorOverlay({root,selected,width,cards,ready}: {
  root:Ref<HTMLElement | undefined>;selected:Readonly<Ref<string | undefined>>;width:Ref<number>;cards:Readonly<Ref<boolean>>;ready:Readonly<Ref<boolean>>
}) {
  return useEditorOverlay({
    key: selected, width, onSource: cards, ready,
    anchor: () => Array.from(root.value?.querySelectorAll<HTMLElement>('[data-point-id]') || []).find(element => element.dataset.pointId === selected.value),
    viewport: () => root.value?.querySelector<HTMLElement>('.cw-point-scroll') || undefined,
    panelWidth: rect => Math.min(width.value - 2, cards.value ? rect.width : Math.min(520, Math.max(440, rect.width))),
  })
}
