export const uniqueByKey = (arr = [], key = 'dataIndex') => {
    const indexMap = new Map()
    const result: any[] = []

    arr.forEach(item => {
        const val = item[key]
        if (indexMap.has(val)) {
            // 覆盖原位置的数据
            result[indexMap.get(val)] = item
        } else {
            // 第一次出现，记录位置
            indexMap.set(val, result.length)
            result.push(item)
        }
    })

    return result
}
