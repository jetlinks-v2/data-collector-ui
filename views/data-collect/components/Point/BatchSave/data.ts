export const uniqueByKey = <T extends { dataIndex: string }>(arr: T[] = [], key: keyof T = 'dataIndex'): T[] => {
    const indexMap = new Map<T[keyof T], number>()
    const result: T[] = []

    arr.forEach(item => {
        const val = item[key]
        if (indexMap.has(val)) {
            // 覆盖原位置的数据
            result[indexMap.get(val)!] = item
        } else {
            // 第一次出现，记录位置
            indexMap.set(val, result.length)
            result.push(item)
        }
    })

    return result
}
