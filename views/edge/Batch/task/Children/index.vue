<template>
  <div class="container">
    <div class="header">
      <span>
        <AIcon
          type="ExclamationCircleFilled"
          style="color: #1677ff; margin-right: 4px"
        />
        {{ $t("Children.index.645257-0") }}
      </span>
    </div>
    <div style="width: 65vw">
      <a-tabs :activeKey="edgeId" @change="handleChangeTab">
        <a-tab-pane v-for="item in options" :key="item.id">
          <template #tab>
            <div style="text-wrap: initial; display: flex">
              <j-badge-status
                :status="item.state?.value"
                :statusNames="{
                  online: 'success',
                  offline: 'error',
                  notActive: 'warning',
                }"
              />
              <j-ellipsis style="width: 90px">{{ item.label }}</j-ellipsis>
            </div>
          </template>
        </a-tab-pane>
      </a-tabs>
    </div>
    <div class="header-action">
      <div>
        <a-switch v-model:checked="_checked" @change="onChange" />
        <span class="header-action-text">{{
          $t("Children.index.645257-1")
        }}</span>
        <span class="header-action-desc">{{
          $t("Children.index.645257-2")
        }}</span>
      </div>
      <a-space>
        <a-button type="link" @click="handleRefresh"
          ><AIcon type="RedoOutlined"
        /></a-button>
        <a-button v-if="!_checked" type="primary" @click="onSaveAll">{{
          $t("Children.index.645257-3")
        }}</a-button>
      </a-space>
    </div>
    <div class="content">
      <div class="left">
        <template v-if="edgeCurrent.state?.value === 'online'">
          <div class="left-title">
            {{ $t("Children.index.645257-4") }}
            <a-tooltip :title="$t('Children.index.645257-5')">
              <AIcon type="QuestionCircleOutlined" style="margin-left: 2px" />
            </a-tooltip>
          </div>
          <pro-search :columns="columns" type="simple" @search="handleSearch" />
          <div class="left-list">
            <a-table
              :columns="columns"
              :dataSource="_dataSource"
              :pagination="false"
              :scroll="{ y: '400px' }"
              :custom-row="customRow"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'id'">
                  <j-ellipsis>
                    {{
                      record.Mappingtype !== "auto"
                        ? record.id
                        : $t("Children.index.645257-6")
                    }}</j-ellipsis
                  >
                </template>
                <template v-else-if="column.key === 'name'">
                  <j-ellipsis>{{ record.name }}</j-ellipsis>
                </template>
                <template v-else-if="column.key === 'Mapping'">
                  <div>
                    <a-tag
                      :color="stateMap.get(record.MappingStatus)?.status"
                      >{{ stateMap.get(record.MappingStatus)?.text }}</a-tag
                    >
                  </div>
                </template>
                <template v-else-if="column.key === 'MappingId'">
                  <div
                    v-if="!record?.Mapping?.id"
                    class="left-drag"
                    @dragover.prevent
                    @drop="(e) => onDrop(e, record)"
                  >
                    <j-ellipsis>
                      {{ $t("Children.index.645257-7") }}
                    </j-ellipsis>
                  </div>
                  <div
                    v-else
                    class="left-map"
                    @dragover.prevent
                    @drop="(e) => onCover(e, record)"
                  >
                    <div>
                      <j-ellipsis>
                        {{ record.Mapping.name }}({{
                          record.Mapping.id
                        }})</j-ellipsis
                      >
                    </div>

                    <a-button
                      v-if="!record.loading"
                      type="link"
                      @click="onDelete(record)"
                    >
                      <AIcon type="DeleteOutlined" />
                    </a-button>

                    <a-button
                      v-if="!record.loading && record.MappingStatus === 'error'"
                      type="link"
                      style="padding: 0"
                      @click="
                        record.action === 'drop'
                          ? onDrop('', record)
                          : onDelete(record)
                      "
                    >
                      <AIcon type="RedoOutlined" />
                    </a-button>
                    <a-spin v-if="record.loading" />
                  </div>
                </template>
              </template>
            </a-table>
          </div>

          <div class="left-bottom" @dragover.prevent @drop="onDropAuto">
            {{ $t("Children.index.645257-8") }}
          </div>
        </template>
        <template v-else>
          <div class="left-empty">
            <div>
              <img :src="EmptyChildImg" alt="" />
            </div>
            <div style="color: #1f2429; font-size: 16px">
              {{ $t("Children.index.645257-9") }}
            </div>
            <div class="left-empty-desc">
              {{ $t("Children.index.645257-10") }}
            </div>
            <a-button type="primary" @click="onRefresh">{{
              $t("Children.index.645257-11")
            }}</a-button>
          </div>
        </template>
      </div>
      <div class="right">
        <div class="right-title">
          <span>{{ $t("Children.index.645257-12") }}</span>
          <a-input-search
            v-model:value="_search"
            style="width: 200px"
            :placeholder="$t('Children.index.645257-13')"
            enter-button
            @search="onRightSearch"
          />
        </div>
        <div class="right-list">
          <template v-if="edgeList.length">
            <div
              v-for="item in edgeList"
              class="right-item"
              :draggable="true"
              @dragstart="() => onStart(item)"
              @click="onDetail(item)"
            >
              <div class="item-name">
                <j-ellipsis>{{ item.name }}</j-ellipsis>
              </div>
              <div class="item-info">
                <span>
                  <j-ellipsis>ID:{{ item.id }}</j-ellipsis>
                </span>
                <span style="display: flex; align-items: center">
                  <j-ellipsis
                    >{{ $t("Children.index.645257-14")
                    }}{{ item.productName }}</j-ellipsis
                  >
                  <AIcon
                    v-if="item.masterProductId"
                    type="CloudOutlined"
                    style="color: #4096ff; margin-left: 3px"
                  />
                </span>
                <span>
                  <j-ellipsis
                    >{{ $t("Children.index.645257-15")
                    }}{{ item.describe || "--" }}</j-ellipsis
                  >
                </span>
              </div>
            </div>
            <div class="right-pagination"></div>
          </template>
          <template v-else>
            <j-empty style="margin-top: 50%" />
          </template>
        </div>
        <div class="right-bottom">
          <AIcon type="CloudOutlined" style="color: #4096ff" />
          <span style="color: #646c73; font-size: 12px">
            {{ $t("Children.index.645257-16") }}
          </span>
        </div>
      </div>
    </div>
  </div>
  <DeviceDetail
    v-if="visible"
    :data="_current"
    :type="_type"
    :edgeId="edgeId"
    @close="visible = false"
  />
</template>

<script setup name="TaskChildren">
import {
  queryNoPagingPost,
  addDevice,
  editDevice,
} from "../../../../../api/edge/instance";
import { queryProductList } from "../../../../../api/edge/product";
import { _queryByEdge, _commandByEdge } from "../../../../../api/edge/batch";
import { onlyMessage, randomString } from "@jetlinks-web/utils";
import { cloneDeep } from "lodash-es";
import DeviceDetail from "./DeviceDetail/index.vue";
import EmptyChildImg from "../../../../../assets/edge/empty-child.png";
import { useI18n } from "vue-i18n";
import { Modal } from "ant-design-vue";

const { t: $t } = useI18n();

const props = defineProps({
  options: {
    type: Array,
    default: () => [],
  },
  updateDevice: {
    type: Function,
    default: undefined,
  },
});

const emit = defineEmits(["change"]);

const _dataSource = ref([]);
const edgeList = ref([]);
const _drop = ref({});
const _dropList = ref([]);
const edgeId = ref("");
const edgeCurrent = ref({});
const _checked = ref(true);
const _search = ref("");
const _edgeInitList = ref([]);
const _bindInitList = ref([]);
const visible = ref(false);
const _current = ref({});
const _type = ref("device");
const options = computed(() => {
  return props.options;
});

const stateMap = new Map();
stateMap.set("success", {
  text: $t("Children.index.645257-17"),
  status: "success",
});
stateMap.set("error", {
  text: $t("Children.index.645257-18"),
  status: "error",
});
stateMap.set("warning", {
  text: $t("Children.index.645257-19"),
  status: "warning",
});
stateMap.set("none", {
  text: $t("Children.index.645257-20"),
  status: "default",
});
stateMap.set("delete", {
  text: $t("Children.index.645257-20"),
  status: "default",
});

const columns = [
  {
    title: $t("Children.index.645257-21"),
    dataIndex: "id",
    key: "id",
    search: {
      type: "string",
      defaultTermType: "eq",
    },
    width: 100,
  },
  {
    title: $t("Children.index.645257-22"),
    dataIndex: "name",
    key: "name",
    search: {
      type: "string",
    },
    width: 150,
  },
  {
    title: $t("Children.index.645257-23"),
    key: "Mapping",
    scopedSlots: true,
    width: 90,
    ellipsis: true,
    fixed: "right",
  },
  {
    title: $t("Children.index.645257-24"),
    key: "MappingId",
    fixed: "right",
    scopedSlots: true,
  },
];

const customRow = (record) => {
  return {
    onClick: (e) => {
      // visible.value = true;
      // _current.value = record;
      // _type.value = 'device';
    },
  };
};

const onDetail = (record) => {
  // visible.value = true;
  // _current.value = record;
  // _type.value = 'edge';
};

const handleSearch = async (e) => {
  if (edgeId.value && e) {
    const terms = [
      {
        column: "parentId",
        value: edgeId.value,
        termType: "eq",
        type: "and",
      },
    ];
    if (e?.terms?.length) {
      terms.push(e.terms[0]);
    }
    const res = await queryNoPagingPost({
      paging: false,
      sorts: [{ name: "createTime", order: "desc" }],
      terms: terms,
    });

    if (res.success) {
      const resp = await _queryByEdge(edgeId.value, {
        sorts: [{ name: "_bind.createTime", order: "desc" }],
        terms: [{ column: "key", value: "", termType: "notnull" }],
      });
      if (resp.success) {
        _dropList.value = [...resp.result];
        _bindInitList.value = [...resp.result];
      }
      _dataSource.value = [];
      _dropList.value?.forEach((i) => {
        const isMap = res.result.find(
          (item) => i.id === item.id || i.mappingId === item.id,
        );
        if (isMap?.id) {
          _dataSource.value.push({
            ...isMap,
            MappingStatus: "success",
            Mapping: i,
          });
        }
      });

      res.result.forEach((item) => {
        const isMap = _dropList.value?.find(
          (i) => i.id === item.id || i.mappingId === item.id,
        );
        if (!isMap?.id) {
          _dataSource.value.push({
            ...item,
            MappingStatus: "none",
          });
        }
      });
    }
  }
};

const getNoMapping = async () => {
  const res = await _queryByEdge(edgeId.value, {
    sorts: [{ name: "createTime", order: "desc" }],
    terms: [{ column: "key", value: "", termType: "isnull" }],
  });
  if (res.success) {
    edgeList.value = [...res.result];
    _edgeInitList.value = [...res.result];
  }
};

const onStart = (item) => {
  _drop.value = item;
};

const onDrop = async (e, item) => {
  if (_checked.value) {
    item.loading = true;
    item.Mapping = _drop.value;
    const res = await _commandByEdge(edgeId.value, "BindMasterDevice", {
      deviceId: _drop.value.id,
      masterDeviceId: item.id,
    }).finally(() => {
      item.loading = false;
    });
    if (res.success) {
      item.MappingStatus = "success";
      handleRefresh();
    } else {
      item.MappingStatus = "error";
    }
  } else {
    item.Mapping = _drop.value;
    item.MappingStatus = "warning";
    item.action = "drop";
    edgeList.value = edgeList.value.filter((i) => i.id !== _drop.value.id);
    _edgeInitList.value = _edgeInitList.value.filter(
      (i) => i.id !== _drop.value.id,
    );
    _dropList.value.push(item);
  }
};
//覆盖操作
const onCover = async (e, item) => {
  const coverData = cloneDeep(item.Mapping);
  if (_checked.value) {
    item.loading = true;
    item.Mapping = _drop.value;
    const res = await _commandByEdge(edgeId.value, "BindMasterDevice", {
      deviceId: _drop.value.id,
      masterDeviceId: item.id,
    }).finally(() => {
      item.loading = false;
    });
    if (res.success) {
      item.MappingStatus = "success";
      handleRefresh();
    } else {
      item.MappingStatus = "error";
    }
  } else {
    item.Mapping = {
      ..._drop.value,
    };
    item.MappingStatus = "warning";
    item.action = "drop";
    edgeList.value.unshift(coverData);
    edgeList.value = edgeList.value.filter((i) => i.id !== _drop.value.id);
    _edgeInitList.value = _edgeInitList.value.filter(
      (i) => i.id !== _drop.value.id,
    );
  }
};

const onDropAuto = () => {
  if (_drop.value.masterProductId) {
    queryProductList({
      terms: [
        {
          column: "id",
          value: _drop.value.masterProductId,
          termType: "eq",
        },
      ],
    }).then((res) => {
      if (res.success) {
        if (res.result.data.length > 0) {
          const obj = {
            id: randomString(12),
            name: _drop.value.name,
            Mappingtype: "auto",
            Mapping: _drop.value,
            MappingStatus: "warning",
          };
          edgeList.value = edgeList.value.filter(
            (i) => i.id !== _drop.value.id,
          );
          _edgeInitList.value = _edgeInitList.value.filter(
            (i) => i.id !== _drop.value.id,
          );
          _dataSource.value.unshift(obj);
          _dropList.value.unshift(obj);
          if (_checked.value) {
            onAuto(obj);
          }
        } else {
          onlyMessage($t("Children.index.645257-25"), "error");
        }
      }
    });
  } else {
    onlyMessage($t("Children.index.645257-26"), "warning");
  }
};

const onAuto = async (item) => {
  const deviceInfo = {
    id: item.id,
    name: item.name,
    parentId: edgeId.value,
    productId: item.Mapping.masterProductId,
    productName: item.Mapping.productName,
  };

  const res = await addDevice(deviceInfo);
  if (res.success) {
    item.loading = true;
    const resp = await _commandByEdge(edgeId.value, "BindMasterDevice", {
      deviceId: _drop.value.id,
      masterDeviceId: item.id,
    }).finally(() => {
      item.loading = false;
    });
    if (resp.success) {
      item.MappingStatus = "success";
      handleRefresh();
    } else {
      item.MappingStatus = "error";
    }
  }
};

const onDelete = (item) => {
  item.action = "delete";
  if (item.id && item.parentId) {
    if (_checked.value) {
      item.loading = true;
      _commandByEdge(edgeId.value, "UnbindDevice", {
        key: item.id,
      })
        .then((res) => {
          if (res.success) {
            item.MappingStatus = "none";
            handleRefresh();
          } else {
            item.MappingStatus = "error";
          }
        })
        .finally(() => {
          item.loading = false;
        });
    } else {
      edgeList.value.unshift(item.Mapping);
      _edgeInitList.value.unshift(item.Mapping);
      if (item.MappingStatus === "error") {
        item.Mapping = {};
        item.MappingStatus = "none";
      } else {
        _dataSource.value?.forEach((i) => {
          if (i.Mapping?.id === item.Mapping?.id) {
            i.Mapping = {};
            i.MappingStatus = "none";
          }
        });
        _dropList.value = _dropList.value.filter(
          (i) => i.Mapping?.id !== item.Mapping?.id,
        );
      }
    }
  } else {
    edgeList.value.push(item.Mapping);
    _edgeInitList.value.push(item.Mapping);
    _dataSource.value = _dataSource.value.filter(
      (i) => i.Mapping?.id !== item.Mapping?.id,
    );
    _dropList.value = _dropList.value.filter(
      (i) => i.Mapping?.id !== item.Mapping?.id,
    );
  }
};

const onSaveAll = async (isRefresh = true) => {
  const _arr = _dataSource.value
    .map((item) => {
      if (
        item.MappingStatus === "warning" ||
        item.MappingStatus === "success"
      ) {
        return {
          deviceId: item.Mapping.id,
          key: item.id,
        };
      }
    })
    .filter((item) => item?.deviceId);
  const _none = _bindInitList.value.map((item) => item?.id);
  const _auto = _dataSource.value.filter(
    (item) => item?.Mappingtype === "auto",
  );
  if (_none.length) {
    await _commandByEdge(edgeId.value, "BatchUnbindDevice", {
      deviceId: _none,
    });
  }
  if (_auto.length) {
    const objs = _auto.map((item) => ({
      id: item.id,
      name: item.name,
      parentId: edgeId.value,
      productId: item.Mapping.masterProductId,
      productName: item.Mapping.productName,
    }));
    await editDevice(objs);
  }

  const res = await _commandByEdge(edgeId.value, "BatchBindDevice", {
    bindInfo: _arr,
  });
  if (res.success && isRefresh) {
    handleRefresh();
    onlyMessage($t("Children.index.645257-27"));
  }
};
const onChange = (checked) => {
  if (checked) {
    onSaveAll();
  }
};

const handleRefresh = () => {
  getNoMapping();
  handleSearch(true);
};

const onRefresh = () => {
  props?.updateDevice(edgeId.value);
};

const onRightSearch = (e) => {
  if (e) {
    edgeList.value = _edgeInitList.value.filter((i) => i.name.indexOf(e) > -1);
  } else {
    edgeList.value = _edgeInitList.value;
  }
};

const onClose = async () => {
  const _auto = _dataSource.value.filter(
    (item) => item?.Mappingtype === "auto",
  );
  if (_auto.length) {
    onSaveAll();
  }
};

const isModal = () => {
  return _dataSource.value.some(
    (item) => item && item.MappingStatus === "warning" && item.id,
  );
};

//切换标签页
const handleChangeTab = (e) => {
  if (
    _dataSource.value.some(
      (item) =>
        item.MappingStatus &&
        ["warning", "delete"].includes(item.MappingStatus),
    )
  ) {
    Modal.confirm({
      title: $t("Children.index.645257-29"),
      content: $t("Children.index.645257-28"),
      async onOk() {
        await onSaveAll(false);
        edgeId.value = e;
      },
      onCancel() {
        edgeId.value = e;
      },
    });
  } else {
    edgeId.value = e;
  }
};

onMounted(() => {
  if (props.options?.length) {
    edgeId.value = props.options[0].value;
    edgeCurrent.value = props.options[0];
  }
});

defineExpose({
  onClose,
  checked: isModal,
});

watch(
  () => edgeId.value,
  (val) => {
    const obj = props.options.find((item) => item.value === val);
    if (obj?.value) {
      edgeCurrent.value = obj;
    }
    if (val && obj?.state?.value === "online") {
      handleRefresh();
    } else {
      _dataSource.value = [];
      _edgeInitList.value = [];
      edgeList.value = [];
    }
  },
  { immediate: true },
);
</script>

<style lang="less" scoped>
.container {
  :deep(.ant-tabs-tab + .ant-tabs-tab) {
    margin: 0 0 4px 6px;
  }
  :deep(.ant-tabs-tab) {
    background: #eff0f1;
    padding: 8px 16px;
    border-radius: 6px;
    margin-bottom: 4px;
  }
  :deep(.ant-tabs-tab-active) {
    background: #e6f4ff;
    padding: 8px 16px;
    border-radius: 6px;
    .ant-badge-status-text {
      color: #1677ff;
    }
  }
  :deep(.ant-tabs-ink-bar) {
    display: none;
  }

  .header {
    margin-bottom: 12px;
    background: #e6f4ff;

    box-sizing: border-box;
    /* Info/colorInfoBorder */
    border: 1px solid #91caff;
    padding: 8px 12px;
    gap: 8px;
    border-radius: 2px;
    color: rgba(0, 0, 0, 0.88);
    font-size: 14px;
  }

  .header-action {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    .header-action-text {
      margin-left: 0.5rem;
      margin-right: 1.5rem;
      font-weight: 600;
    }
    .header-action-desc {
      color: #8d9399;
    }
  }
  .content {
    display: flex;
    gap: 12px;
    .left {
      flex: 1;
      width: 100%;
      border: 1px solid #c3c7cb;
      // min-height: 50px;
      border-radius: 4px;
      display: flex;
      :deep(.JSearch-warp) {
        padding-bottom: 0 !important;
      }
      flex-direction: column;
      .left-title {
        background: #f8f9fa;
        height: 56px;
        line-height: 56px;
        border-radius: 4px;
        padding-left: 12px;
        box-sizing: border-box;
        /* Gray300 */
        border-width: 0px 0px 1px 0px;
        border-style: solid;
        border-color: #e4e6e7;
      }
      .left-list {
        flex: 1;
        padding: 12px;
        .left-drag {
          border: 1px solid #eff0f1;
          height: 32px;
          line-height: 32px;
          border-radius: 3px;
          color: #a3a3a3;
          font-size: 14px;
          letter-spacing: 0;
          padding-left: 4px;
          // text-align: center;
        }
        .left-map {
          height: 32px;
          background-color: #f8f9fa;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1px solid #eff0f1;
          border-radius: 3px;
          color: #1a1a1a;
          font-size: 14px;
          letter-spacing: 0;
          padding: 0 8px;
        }
      }
      .left-bottom {
        padding: 8px 0;
        padding-left: 12px;
        box-sizing: border-box;
        /* Gray400 */
        border-width: 1px 0px 0px 0px;
        border-style: solid;
        border-color: #c3c7cb;
        font-size: 12px;
        font-weight: normal;
        letter-spacing: 0em;
        /* Gray600 */
        color: #646c73;
      }
      .left-empty {
        height: 90%;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        .left-empty-desc {
          margin: 12px 0;
          color: #646c73;
        }
      }
    }
    .right {
      width: 420px;
      border-radius: 4px;
      border: 1px solid #c3c7cb;
      .right-title {
        background: #020202;
        height: 56px;
        line-height: 56px;
        border-radius: 4px;

        background: #f8f9fa;
        box-sizing: border-box;
        /* Gray300 */
        border-width: 0px 0px 1px 0px;
        border-style: solid;
        border-color: #e4e6e7;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 12px;
      }
      .right-list {
        padding: 12px;
        max-height: 600px;
        min-height: 600px;
        overflow-y: auto;
        .right-item {
          height: 80px;
          border: 1px solid #eff0f1;
          border-radius: 6px;
          background-color: #f8f9fa;
          margin-bottom: 10px;
          padding: 12px;
          .item-name {
            font-size: 16px;
            margin-bottom: 6px;
            color: #1f2429;
          }
          .item-info {
            display: flex;
            gap: 16px;
            font-size: 14px;
            color: #646c73;
            span {
              max-width: 140px;
            }
          }
        }
      }
      .right-bottom {
        margin-top: 12px;
        padding-left: 6px;
      }
    }
  }
}
</style>
