export default [
    {
        code: 'iot',
        name: '物联网',
        owner: 'iot',
        id: '9c21f88182e7cc75cbdfa8e4b7844272',
        url: '/iot',
        icon: 'icon-wulianwang',
        sortIndex: 1,
        permissions: [],
        children: [
            {
                code: 'edge',
                name: '边缘网关',
                owner: 'iot',
                id: 'cc29671ed5ef8d6df951b2fc523f36ca',
                sortIndex: 8,
                url: '/iot/edge',
                icon: 'icon-bianyuanwangguan',
                permissions: [],
                buttons: [],
                children: [
                    {
                        code: 'edge/Device',
                        name: '网关设备',
                        owner: 'iot',
                        id: 'c9f2530273ec057e3a5674faf3c6c073',
                        sortIndex: 1,
                        url: '/iot/edge/Devic',
                        icon: 'icon-bumenguanli',
                        showPage: ['edge-operations'],
                        permissions: [
                            {
                                permission: 'device-product',
                                actions: ['query'],
                            },
                            {
                                permission: 'device-instance',
                                actions: ['query'],
                            },
                        ],
                        buttons: [
                            {
                                id: 'view',
                                name: '查看',
                                permissions: [
                                    {
                                        permission: 'device-instance',
                                        actions: ['query'],
                                    },
                                    {
                                        permission: 'device-product',
                                        actions: ['query'],
                                    },
                                ],
                            },
                            {
                                id: 'action',
                                name: '启/禁用',
                                permissions: [
                                    {
                                        permission: 'device-instance',
                                        actions: ['enable', 'disable'],
                                    },
                                ],
                            },
                            {
                                id: 'delete',
                                name: '删除',
                                permissions: [
                                    {
                                        permission: 'device-instance',
                                        actions: ['query', 'delete'],
                                    },
                                ],
                            },
                            {
                                id: 'update',
                                name: '编辑',
                                permissions: [
                                    {
                                        permission: 'device-instance',
                                        actions: ['save'],
                                    },
                                ],
                            },
                            {
                                id: 'add',
                                name: '新增',
                                permissions: [
                                    {
                                        permission: 'device-instance',
                                        actions: ['save'],
                                    },
                                ],
                            },
                            {
                                id: 'import',
                                name: '导入',
                                permissions: [
                                    {
                                        permission: 'rule-instance',
                                        actions: ['save'],
                                    },
                                ],
                            },
                            {
                                id: 'setting',
                                name: '远程控制',
                                permissions: [
                                    {
                                        permission: 'device-instance',
                                        actions: ['save'],
                                    },
                                    {
                                        permission: 'edge-operations',
                                        actions: ['remote'],
                                    },
                                ],
                            },
                            {
                                id: 'password',
                                name: '重置密码',
                                permissions: [
                                    {
                                        permission: 'edge-operations',
                                        actions: ['invoke'],
                                    },
                                ],
                            },
                        ],
                        accessSupport: { text: "间接支持", value: "indirect" },
                        supportDataAccess: false,
                        indirectMenus: ['1b136e7e4e4e74bb24b91802e4cfcd2d']
                    },
                    {
                        code: 'edge/Resource',
                        name: '资源库',
                        owner: 'iot',
                        id: '7f49fcece2b291aa595a0ace3ea43ca1',
                        sortIndex: 2,
                        url: '/iot/edge/Resource',
                        icon: 'icon-Vector',
                        showPage: ['edge-operations'],
                        permissions: [
                            {
                                permission: 'entity-template',
                                actions: ['query'],
                            },
                        ],
                        buttons: [
                            {
                                id: 'view',
                                name: '查看',
                                permissions: [
                                    {
                                        permission: 'entity-template',
                                        actions: ['query'],
                                    },
                                ],
                            },
                            {
                                id: 'action',
                                name: '启/禁用',
                                permissions: [
                                    {
                                        permission: 'entity-template',
                                        actions: ['enable', 'disable'],
                                    },
                                ],
                            },
                            {
                                id: 'delete',
                                name: '删除',
                                permissions: [
                                    {
                                        permission: 'entity-template',
                                        actions: ['delete'],
                                    },
                                ],
                            },
                            {
                                id: 'update',
                                name: '编辑',
                                permissions: [
                                    {
                                        permission: 'entity-template',
                                        actions: ['save'],
                                    },
                                ],
                            },
                            {
                                id: 'setting',
                                name: '下发',
                                permissions: [
                                    {
                                        permission: 'device-instance',
                                        actions: ['query'],
                                    },
                                    {
                                        permission: 'edge-operations',
                                        actions: ['invoke'],
                                    },
                                    {
                                        permission: 'entity-template',
                                        actions: ['query'],
                                    },
                                ],
                            },
                        ],
                        accessSupport: { text: "不支持", value: "unsupported" },
                        supportDataAccess: false
                    },
                ],
            },
            {
                code: 'link/DataCollect',
                name: '数据采集',
                id: '3e5a9473e284803134b3f63c086d7385',
                owner: 'iot',
                sortIndex: 10,
                url: '/iot/link/DataCollect',
                icon: 'icon-analytics',
                showPage: [],
                permissions: [],
                children: [
                    {
                        code: 'DataCollect/Dashboard',
                        name: '仪表盘',
                        owner: 'iot',
                        sortIndex: 1,
                        id: '802c1d835cd9f687ffb2092b593fb1b8',
                        url: '/iot/DataCollect/Dashboard',
                        icon: 'icon-keshihua',
                        showPage: [
                            'data-collect-channel',
                            'data-collect-opc',
                            'data-collector',
                            'things-collector',
                        ],
                        permissions: [
                            { permission: 'dashboard', actions: ['query'] },
                            { permission: 'data-collect-channel', actions: ['query'] },
                            { permission: 'data-collect-opc', actions: ['query'] },
                            { permission: 'data-collector', actions: ['query'] },
                            { permission: 'things-collector', actions: ['query'] },
                        ],
                        buttons: [],
                        accessSupport: { text: "不支持", value: "unsupported" },
                        supportDataAccess: false
                    },
                    {
                        code: 'DataCollect/Channel',
                        name: '通道管理',
                        owner: 'iot',
                        id: 'e867ee3d31a7b963d38f40a3b51d0191',
                        sortIndex: 2,
                        url: '/iot/DataCollect/Channel',
                        icon: 'icon-rizhifuwu',
                        showPage: [
                            'data-collect-channel',
                            'data-collect-opc',
                            'data-collector',
                            'things-collector',
                        ],
                        permissions: [],
                        buttons: [
                            {
                                id: 'view',
                                name: '查看',
                                permissions: [
                                    {
                                        permission: 'data-collect-channel',
                                        actions: ['query'],
                                    },
                                    {
                                        permission: 'data-collector',
                                        actions: ['query'],
                                    },
                                    {
                                        permission: 'data-collect-opc',
                                        actions: ['query'],
                                    },
                                    {
                                        permission: 'things-collector',
                                        actions: ['query'],
                                    },
                                ],
                            },
                            {
                                id: 'add',
                                name: '新增',
                                permissions: [
                                    {
                                        permission: 'data-collect-channel',
                                        actions: ['save', 'query'],
                                    },
                                    {
                                        permission: 'data-collector',
                                        actions: ['save', 'query'],
                                    },
                                    {
                                        permission: 'data-collect-opc',
                                        actions: ['save', 'query'],
                                    },
                                    {
                                        permission: 'things-collector',
                                        actions: ['save', 'query'],
                                    },
                                ],
                            },
                            {
                                id: 'update',
                                name: '编辑',
                                permissions: [
                                    {
                                        permission: 'data-collect-channel',
                                        actions: ['save', 'query'],
                                    },
                                    {
                                        permission: 'data-collector',
                                        actions: ['save', 'query'],
                                    },
                                    {
                                        permission: 'data-collect-opc',
                                        actions: ['save', 'query'],
                                    },
                                    {
                                        permission: 'things-collector',
                                        actions: ['save', 'query'],
                                    },
                                    {
                                        permission: 'certificate',
                                        actions: ['query'],
                                    },
                                ],
                            },
                            {
                                id: 'action',
                                name: '禁用/启用',
                                permissions: [
                                    {
                                        permission: 'data-collect-channel',
                                        actions: ['save', 'query'],
                                    },
                                    {
                                        permission: 'data-collector',
                                        actions: ['save', 'query'],
                                    },
                                    {
                                        permission: 'data-collect-opc',
                                        actions: ['save', 'query'],
                                    },
                                    {
                                        permission: 'things-collector',
                                        actions: ['save', 'query'],
                                    },
                                ],
                            },
                            {
                                id: 'delete',
                                name: '删除',
                                permissions: [
                                    {
                                        permission: 'data-collect-channel',
                                        actions: ['delete', 'query'],
                                    },
                                    {
                                        permission: 'data-collector',
                                        actions: ['delete', 'query'],
                                    },
                                    {
                                        permission: 'data-collect-opc',
                                        actions: ['delete', 'query'],
                                    },
                                    {
                                        permission: 'things-collector',
                                        actions: ['delete', 'query'],
                                    },
                                ],
                            },
                        ],
                        accessSupport: { text: "支持", value: "support" },
                        supportDataAccess: true,
                        assetType: 'dataCollectChannel'
                    },
                    {
                        code: 'DataCollect/Collector',
                        name: '采集器',
                        owner: 'iot',
                        id: 'f97141d2737ebc3e3ab2cda4a38e8c79',
                        sortIndex: 3,
                        url: '/iot/DataCollect/Collector',
                        icon: 'icon-yingyongguanli',
                        showPage: [
                            'data-collect-channel',
                            'data-collect-opc',
                            'data-collector',
                            'things-collector',
                        ],
                        permissions: [],
                        buttons: [
                            {
                                "id": "view",
                                "name": "查看",
                                "permissions": [
                                    {
                                        "permission": "data-collect-channel",
                                        "actions": [
                                            "query"
                                        ]
                                    },
                                    {
                                        "permission": "data-collector",
                                        "actions": [
                                            "query"
                                        ]
                                    },
                                    {
                                        "permission": "data-collect-opc",
                                        "actions": [
                                            "query"
                                        ]
                                    },
                                    {
                                        "permission": "things-collector",
                                        "actions": [
                                            "query"
                                        ]
                                    },
                                    {
                                        "permission": "s7-client",
                                        "actions": [
                                            "query"
                                        ]
                                    }
                                ]
                            },
                            {
                                "id": "add",
                                "name": "新增",
                                "permissions": [
                                    {
                                        "permission": "data-collect-channel",
                                        "actions": [
                                            "query",
                                            "save"
                                        ]
                                    },
                                    {
                                        "permission": "data-collector",
                                        "actions": [
                                            "query",
                                            "save"
                                        ]
                                    },
                                    {
                                        "permission": "data-collect-opc",
                                        "actions": [
                                            "query",
                                            "save"
                                        ]
                                    },
                                    {
                                        "permission": "things-collector",
                                        "actions": [
                                            "query",
                                            "save"
                                        ]
                                    },
                                    {
                                        "permission": "s7-client",
                                        "actions": [
                                            "query"
                                        ]
                                    }
                                ]
                            },
                            {
                                "id": "update",
                                "name": "编辑",
                                "permissions": [
                                    {
                                        "permission": "data-collect-channel",
                                        "actions": [
                                            "query",
                                            "save"
                                        ]
                                    },
                                    {
                                        "permission": "data-collector",
                                        "actions": [
                                            "query",
                                            "save"
                                        ]
                                    },
                                    {
                                        "permission": "data-collect-opc",
                                        "actions": [
                                            "query",
                                            "save"
                                        ]
                                    },
                                    {
                                        "permission": "things-collector",
                                        "actions": [
                                            "query",
                                            "save"
                                        ]
                                    },
                                    {
                                        "permission": "certificate",
                                        "actions": [
                                            "query"
                                        ]
                                    },
                                    {
                                        "permission": "s7-client",
                                        "actions": [
                                            "query"
                                        ]
                                    }
                                ]
                            },
                            {
                                "id": "action",
                                "name": "禁用/启用",
                                "permissions": [
                                    {
                                        "permission": "data-collect-channel",
                                        "actions": [
                                            "query",
                                            "save"
                                        ]
                                    },
                                    {
                                        "permission": "data-collector",
                                        "actions": [
                                            "query",
                                            "save"
                                        ]
                                    },
                                    {
                                        "permission": "data-collect-opc",
                                        "actions": [
                                            "query",
                                            "save"
                                        ]
                                    },
                                    {
                                        "permission": "things-collector",
                                        "actions": [
                                            "query",
                                            "save"
                                        ]
                                    },
                                    {
                                        "permission": "s7-client",
                                        "actions": []
                                    }
                                ]
                            },
                            {
                                "id": "delete",
                                "name": "删除",
                                "permissions": [
                                    {
                                        "permission": "data-collect-channel",
                                        "actions": [
                                            "query",
                                            "delete"
                                        ]
                                    },
                                    {
                                        "permission": "data-collector",
                                        "actions": [
                                            "query",
                                            "delete"
                                        ]
                                    },
                                    {
                                        "permission": "data-collect-opc",
                                        "actions": [
                                            "query",
                                            "delete"
                                        ]
                                    },
                                    {
                                        "permission": "things-collector",
                                        "actions": [
                                            "query",
                                            "delete"
                                        ]
                                    }
                                ]
                            }
                        ],
                        accessSupport: { text: "支持", value: "support" },
                        supportDataAccess: true,
                        assetType: 'dataCollectCollector'
                    },
                ],
            },
        ]
    },

]
