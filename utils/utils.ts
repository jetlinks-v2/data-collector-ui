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

export const handlePointConfigMetadata = (data: Array<Record<string, any>>) => {
    const columns: Array<any> = []
    const values: Record<string, any> = {}

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

    function handleObject(properties: Array<Record<string, any>>, _columns: Record<string, any> ) {
        return properties.reduce((prev: any, next: Record<string, any>) => {
            prev[next.id] = undefined
            _columns.push({
                title: next.i18nName,
                dataIndex: next.id,
                template: handleType(next.valueType?.type, next),
                width: 220
            })
            return prev
        }, {})
    }

    data.forEach(item => {
        const column = {
            title: item.i18nName,
            dataIndex: item.id,
            template: {
                components: 'a-input',
            },
            width: 220
        }

        values[item.id] = undefined

        const type = item.valueType.type
        if (type === 'object') {
            values[item.id] = handleObject(item.valueType.properties, columns)
        } else if (type === 'enum') {
            column.template = handleType(item.valueType.type, item)
            columns.push(column)
        } else {
            columns.push(column)
        }
    })

    return {
        values,
        columns
    }
}
