# 数据采集页面

当前入口属于 `runtime-ui/modules/data-collector-ui`。本页采用运行时设备列表的双栏布局、共享组件与主题 token；点位详情已由抽屉改为独立页面。旧版 `views/DataCollect/`、运营端 `ui/`、后端接口及通道／采集器详情承载方式保持原有边界。

## 页面与实现入口

- `index.vue`、`Left/index.vue`、`Right.vue`：`EqualHeightColumns` 双栏。左侧搜索置顶、新增入口置底，树独立滚动；默认紧凑视图，保留分离视图和折叠。树节点显示通道／采集器、运行／停止点位数、状态与更多操作。
- `Left/useCollectTree.ts`：树加载、搜索、范围选择、筛选及旧扫描／批量新增页返回兼容。刷新保持当前范围；搜索派生树，不修改原始节点。
- `components/Header.vue`、`components/useCollectHeader.ts`：当前范围标题、异常统计和原有通道／采集器详情入口。
- `components/Point/PointTable.vue`：`ConditionFilter`、状态筛选、`BatchDropdown`、列设置、表格和底部分页。采集器专属新增、扫描、批量新增、导入及导出入口保留，按可用空间换行。
- `components/Point/columns.ts`：默认显示名称与状态、更新时间、地址、访问模式、采集间隔、说明、编辑／删除。实时值可从列设置开启；更新时间使用 `modifyTime`，空时间显示占位，地址 `0` 正常显示。
- `components/Point/Detail/index.vue`、`PointSummary.vue`：复用 `PageChrome`、`ContentPanel`、`SlantedTabs`，展示返回入口、摘要、实时值、编辑／删除与六个页签。
- 模块 `index.ts`：新增扩展路由 `data-collect/PointDetail`，子路径 `/point/:id`，由现有菜单路由装配，不新增菜单配置数据。

组件与样式锚点为设备模块的 `IotDeviceAssetListView.vue`、`IotDeviceScopeSidebar.vue`、`IotDeviceAssetTable.vue` 和 `IotDeviceDetailView.vue`；没有导入设备模块私有组件或整份业务样式。新增文案同步 `locales/lang/zh.json`、`en.json`、`ja.json`。

## 查询、分页和选择

`hook/useCollectRouteState.ts` 将范围、状态、条件、排序、页码、每页条数、树搜索与视图模式同步到 URL；条件使用 core 的编解码工具。`usePointSearch.ts` 区分条件编辑态与实际查询提交，避免初始化回传条件时重置返回页码。

`usePointList.ts`、`pointQuery.ts` 和 `usePointTablePagination.ts` 统一管理服务端分页：默认 10 条，可选 20／50／100 条；范围、有效条件、状态或排序变化回到第一页。列表、计数及条件批量操作共用查询范围，排序追加 ID 次级排序。删除后页码越界时加载最后有效页；接口未返回总数时补充计数查询。请求失败展示重试，版本校验阻止旧响应覆盖新查询。

`usePointSelection.ts` 按 ID 保留同一查询下跨页勾选；查询变化清除选择。“全选所有”继续调用现有条件批量接口，普通勾选使用已选记录。`usePointActions.ts` 维护原有权限判断、协议扩展及批量操作。

`usePointValues.ts` 仅订阅当前页或当前详情点位；换页、范围变化、失活和卸载释放订阅，旧订阅迟到事件被忽略。仅名称／配置变化时保留当前采样值。实时值继续使用现有 `pointValue` 精度处理与读写组件。

## 详情路由与保存

详情根据路由 ID 调用 `pointDetail`，支持刷新、直接访问及切换点位；提供加载、错误重试、不存在和无权限状态。页签保留详情、高级配置、历史数据、关联设备、点位日志、告警，默认进入详情。

- `usePointDetail.ts`：详情查询、串行保存、失败草稿重试、页签／路由离开保护、编辑及删除。名称和说明继续 inline 编辑，顶部编辑复用 `Point/Save/index.vue`。编辑表单的正在保存和失败输入也参与离开保护。
- `usePointDetailForm.ts`：协议配置本地草稿、表单校验和即时保存；服务端刷新不会覆盖未保存输入。详情配置保留 `configuration.interval` 同步；缺失的访问模式和功能数组按空数组处理。
- `usePointDetailMetadata.ts`：协议资源与物模型加载绑定当前点位，忽略旧响应。
- `RelatedDevice/usePointRelatedDevices.ts`：从既有页面提取关联设备查询与保存逻辑，保留自动／手动物模型映射及导入、删除能力；失败或校验不通过时保留草稿，切换页签／离开时允许继续编辑或明确放弃。父级详情刷新不覆盖关联草稿。空映射直接显示空态，不再访问未定义的旧回退字段。
- `pointDetailNavigation.ts`：返回地址仅允许当前项目／模块列表路径。列表进入详情携带当前 URL，返回恢复查询、分页并刷新；直接访问时返回默认列表，删除成功返回列表。失活后重新进入列表同时刷新树、统计和点位。

## 验证结果（2026-11-06）

以下命令在仓库根目录执行（测试命令使用模块目录）：

```sh
cd runtime-ui/modules/data-collector-ui
node --test tests/pointTablePagination.test.mjs tests/pointWorkspace.test.mjs
node --test tests/deadbandTerms.test.mjs tests/pointValuePrecision.test.mjs
```

```sh
pnpm -C runtime-ui exec vue-tsc --noEmit -p modules/data-collector-ui/tsconfig.json
pnpm -C runtime-ui -F jetlinks-web-core build -- --module-name data-collector-ui
```

- 分页与工作区定向测试 **13/13 通过**：分页总数、替换当前页、越界回退、迟到响应、失败重试、跨页选择／查询全选、共享查询范围、订阅释放、精确值保留、安全返回地址、路由 ID 加载、串行保存、失败草稿、校验／放弃、顶部编辑等待、条件初始化及返回页码恢复、关联设备草稿保护。
- 死区及数据精度回归 **13/15 通过**。两个既有失败位于共享 WebSocket 客户端源码／发布入口的大整数帧解析，预期 `18446744073709551615`，实际被转换为 `18446744073709552000`；本次没有修改共享客户端。HTTP 精度解析、点位显示、图表精度和死区测试通过。合计 **26/28 通过**。
- Vue SFC 模板／脚本／样式及 TypeScript 转换检查：本次涉及 **39 个文件，0 错误**；`git diff --check` 通过。
- 模块生产构建通过；存在既有包体积及依赖相关警告。
- 模块 `vue-tsc` 仍有 **438 项诊断**，来自共享代码、依赖及未改实现；本次新增／重写文件没有诊断。触及的 `utils.ts` 中 40 项诊断位于未改代码，本次仅补充通道查询失败抛错。
- 工作区、core 和模块均未提供 lint 脚本，没有将编译或差异检查表述为 lint 通过。
- 浏览器隔离数据验证使用真实列表与详情壳组件、详情／高级配置／关联设备表单：核对 1280px 与 768px 布局、分离视图、折叠、列配置入口及可选实时值、地址 0、空时间、跨页勾选、第二页进入详情并返回恢复、详情直达、六个页签切换、未完成关联编辑的继续／放弃、列表空态／错误重试入口、详情加载／不存在状态。

当前浏览器访问真实应用需要登录，因此真实后端权限、协议动态扩展、读写、批量操作、编辑／删除以及历史数据／点位日志／告警的实际数据联调仍待登录后验证。隔离环境使用模拟 API 和订阅；历史／日志／告警仅验证页签入口，不能替代真实内容验收。临时预览位于工作区外，不包含在产品代码中。
