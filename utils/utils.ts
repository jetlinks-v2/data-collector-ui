import {getResourceFile} from "../api/data-collect/channel";
import axios from "axios";

/** Installed plugin resources take precedence over bundled development examples. */
export const devGetProtocol = async (protocol: string, module: string): Promise<string | undefined> => {
    // Keep the root SFC at its real URL so its relative imports resolve beside the plugin.
    const resource = `/data-collect/${encodeURIComponent(protocol)}/resource/_/script/${module}.vue`
    const entry = () => `<template><PluginView /></template><script setup>import PluginView from ${JSON.stringify(resource)}<\/script>`
    const componentSource = (value: unknown): value is string => typeof value === 'string'
        && !/<(?:!doctype|html)[\s>]/i.test(value)
        && /<(?:template|script)[\s>]/.test(value)
    try {
        const source = await getResourceFile(protocol, module)
        if (componentSource(source)) return entry()
    } catch { /* A bundled editor can still serve older installed plugins. */ }
    try {
        const response = await axios.get(`/protocol/${protocol}/${module}.vue`)
        if (componentSource(response.data)) return response.data
    } catch { /* The host displays the plugin-unavailable state. */ }
    return undefined
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
