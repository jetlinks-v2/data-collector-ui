import {getResourceFile} from "../api/data-collect/channel";
import axios from "axios";

export const devGetProtocol = async (protocol: string, module: string) => {
    try {
        const isDevelopment = import.meta.env.MODE === 'development'

        if (isDevelopment) {
            const resp = await axios.get(`/protocol/${protocol}/${module}.vue`)
            return resp.data
        } else {
            const resp = await getResourceFile(protocol, module).catch(async (e) => {
                if(e){
                    const resp = await axios.get(`/protocol/${protocol}/${module}.vue`)
                    return resp.data
                }
            })
            return resp
        }

    } catch (e) {
        return undefined
    }
}

export const handlePointConfigMetadata = (data: Array<Record<string, any>>, parentId: string) => {
    const columns: Array<any> = []
    const values: Record<string, any> = {}
    const fieldPathMap: Record<string, Array<string>> = {}

    function handleType(type: string, record: Record<string, any>) {
        const valueType = record.valueType
        switch (type) {
            case 'int':
            case 'double':
            case 'float':
                return {
                    components: 'a-input-number',
                    props: {
                        max: 99999999,
                        min: -9999999
                    }
                }
            case 'boolean':
                return {
                    components: 'a-select',
                    props: {
                        options: [
                            { label: valueType.trueText, value: valueType.trueValue },
                            { label: valueType.falseText, value: valueType.falseValue },
                        ]
                    }
                }
            case 'enum':
                return {
                    components: 'a-select',
                    props: {
                        options: record.valueType.elements.map((item: Record<string, any>) => ({ label: item.text, value: item.value })),
                    }
                }
            default:
                return {
                    components: 'a-input',
                }
        }
    }

    function handleObject(properties: Array<Record<string, any>>, _columns: Record<string, any> , paths: Array<string>) {
        return properties.reduce((prev: any, next: Record<string, any>) => {
            const _paths = [...paths, next.id]
            prev[next.id] = undefined
            _columns.push({
                title: next.i18nName,
                dataIndex: next.id,
                template: handleType(next.valueType?.type || next.valueType?.id, next),
                width: 220,
                form: {
                    name: _paths
                }
            })
            fieldPathMap[next.id] = _paths
            return prev
        }, {})
    }

    data.forEach(item => {
        const _path = [parentId, item.id]
        const column = {
            title: item.i18nName,
            dataIndex: item.id,
            template: {
                components: 'a-input',
            },
            width: 220,
            ellipsis: true,
            form: {
                name: _path
            }
        }

        values[item.id] = undefined
        fieldPathMap[item.id] = _path

        const type = item.valueType.type
        if (type === 'object') {
            values[item.id] = handleObject(item.valueType.properties, columns, _path)
        } else if (type === 'enum' || type === 'boolean') {
            column.template = handleType(item.valueType.type || item.valueType.id, item)
            columns.push(column)
        } else {
            columns.push(column)
        }
    })

    return {
        values,
        columns,
        fieldPathMap
    }
}
