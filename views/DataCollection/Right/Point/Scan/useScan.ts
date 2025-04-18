export const ScanContextKey = Symbol('scan-context-key')

export const useScan = () => {
  return inject(ScanContextKey, [])
}
