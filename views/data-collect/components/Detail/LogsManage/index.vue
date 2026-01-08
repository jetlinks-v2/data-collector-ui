<template>
  <div class="console-log">
    <div class="console-header">
      <a-flex justify="space-between">
        <div class="console-controls">
          <a-select v-model:value="logLevel" @change="filterLogs" style="width: 100px;">
            <a-select-option value="all">全部</a-select-option>
            <a-select-option value="INFO">INFO</a-select-option>
            <a-select-option value="WARN">WARN</a-select-option>
            <a-select-option value="ERROR">ERROR</a-select-option>
            <a-select-option value="DEBUG">DEBUG</a-select-option>
          </a-select>
          <div class="search-container">
            <a-input-search
              placeholder="搜索日志内容..."
              class="search-input"
              allowClear
              @search="handleSearch"
            />
          </div>
          <div v-if="searchText && searchResults.length > 0" class="search-info">
            {{ currentMatchIndex + 1 }} / {{ totalMatches }}
          </div>
          <div v-if="searchText" class="search-navigation">
            <a-button @click="previousMatch" :disabled="searchResults.length === 0">
              <AIcon type="UpOutlined" />
            </a-button>
            <a-button @click="nextMatch" :disabled="searchResults.length === 0">
              <AIcon type="DownOutlined" />
            </a-button>
          </div>
          <a-button type="primary" @click="toggleAutoScroll">
            滚动到底部
          </a-button>
        </div>
        <div class="console-controls">
          <slot name="extra"></slot>
          <a-space>
            <j-permission-button :disabled="!logs.length" danger :popConfirm="{
              title: '确认重置？',
              onConfirm: () => resetLogs()
            }">
              <AIcon type="ReloadOutlined"/>
              重置
            </j-permission-button>
            <a-button type="primary" @click="pause">
              <template v-if="!isPaused">
                <AIcon type="PauseCircleOutlined"/>
                暂停
              </template>
              <template v-else>
                <AIcon type="PlayCircleOutlined"/>
                开始
              </template>
            </a-button>
          </a-space>
        </div>
      </a-flex>
    </div>
    <div ref="logContainer" class="console-content" @scroll="handleScroll">
      <div
        v-for="(log, index) in filteredLogs"
        :key="index"
        :class="['log-line', { 'search-highlight-line': isSearchMatch(index) }]"
        :ref="(el) => setLogLineRef(el, index)"
      >
        <span class="log-time">{{
          dayjs(log.timestamp).format("YYYY-MM-DD HH:mm:ss.SSS")
        }}</span>
        <span :class="['log-level', `log-${log.level}`]">{{
          log.level.toUpperCase()
        }}</span>
        <span v-if="log.location" class="log-location" v-html="highlightText(log.location, index, 'location')"></span>
        <span v-if="log.message" class="log-message" v-html="highlightText(log.message, index, 'message')"></span>
        <div v-if="log.stackTrace" class="log-content-wrapper">
          <span
            v-if="shouldShowToggle(log.stackTrace)"
            @click="toggleCollapse(index)"
            class="collapse-toggle"
          >
            <AIcon v-if="isCollapsed(index)" type="DownOutlined" />
            <AIcon v-else type="UpOutlined" />
          </span>
          <span
            :class="[
              'log-content',
              {
                collapsed: isCollapsed(index) && shouldShowToggle(log.stackTrace),
              },
            ]"
            v-html="highlightText(log.stackTrace, index, 'stackTrace')"
            :ref="(el) => setLogContentRef(el, index)"
          ></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import dayjs from "dayjs";
import { wsClient } from "@jetlinks-web/core";

const emit = defineEmits(["clear-logs"]);

const props = defineProps({
  maxLines: {
    type: Number,
    default: 1000000,
  },
  id: {
    type: String,
    default: '',
  },
  topic: {
    type: String,
    default: '',
  },
});

const wsRef = ref();
const logs = ref([])
const logContainer = ref(null);
const autoScroll = ref(true);
const logLevel = ref("all");
const isUserScrolling = ref(false);
const searchText = ref("");
const searchResults = ref([]);
const currentSearchIndex = ref(0);
const currentMatchIndex = ref(0);
const totalMatches = ref(0);
const logLineRefs = ref({});
const logContentRefs = ref({});
const collapsedStates = ref({});
//日志字段
// 时间戳	显示时间戳（精确到毫秒）
// 日志级别	显示日志级别
// 类与方法位置	显示日志发生位置
// 日志信息（简介行）	显示单行摘要
// 堆栈跟踪	若某一日志存在详情链路（堆栈跟踪），默认展开最多 5 行，后续折叠为 …，点击前方的折叠按钮展开/收起

const isPaused = ref(false)
const subscribeData = () => {
  wsRef.value = wsClient.getWebSocket(props.id, props.topic)
  .subscribe(({payload}) => {
    logs.value.push(payload)
  })
}
const pause = () => {
  if(isPaused.value) {
    subscribeData()
  } else {
    wsRef.value?.unsubscribe()
  }
  isPaused.value = !isPaused.value
}

const resetLogs = () => {
  logs.value = []
}

const filteredLogs = computed(() => {
  if (logLevel.value === "all") {
    return logs.value.slice(-props.maxLines);
  }
  return logs.value
    .filter((log) => log.level === logLevel.value)
    .slice(-props.maxLines);
});

const setLogLineRef = (el, index) => {
  if (el) {
    logLineRefs.value[index] = el;
  }
};

const setLogContentRef = (el, index) => {
  if (el) {
    logContentRefs.value[index] = el;
  }
};

const isCollapsed = (index) => {
  return collapsedStates.value[index] ?? true;
};

const shouldShowToggle = (message) => {
  if (!message) return false;
  // 简单的行数检测：按换行符分割或者按长度估算
  const lines = message.split("\n");
  if (lines.length > 5) return true;

  // 如果没有换行符，按字符长度估算（假设每行约80字符）
  const estimatedLines = Math.ceil(message.length / 80);
  return estimatedLines > 5;
};

const toggleCollapse = (index) => {
  collapsedStates.value[index] = !isCollapsed(index);
};

const isSearchMatch = (index) => {
  return searchResults.value.find((item) => item.index === index);
};

const highlightText = (text, logIndex, fieldType) => {
  if (!searchText.value || !text) {
    return text;
  }

  const regex = new RegExp(`(${escapeRegExp(searchText.value)})`, "gi");
  
  // 找到当前日志行在搜索结果中的信息
  const currentLogResult = searchResults.value.find(result => result.index === logIndex);
  if (!currentLogResult) {
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  // 计算当前日志行之前的所有匹配数量
  let matchesBefore = 0;
  for (const result of searchResults.value) {
    if (result.index < logIndex) {
      matchesBefore += result.matches;
    } else {
      break;
    }
  }

  // 计算当前日志行内，当前字段之前的匹配数量
  let matchesBeforeCurrentField = 0;
  const currentLog = filteredLogs.value[logIndex];
  const fieldOrder = ['location', 'message', 'stackTrace'];
  const currentFieldIndex = fieldOrder.indexOf(fieldType);
  
  for (let i = 0; i < currentFieldIndex; i++) {
    const fieldName = fieldOrder[i];
    const fieldContent = currentLog[fieldName];
    if (fieldContent) {
      const fieldMatches = fieldContent.match(regex);
      if (fieldMatches) {
        matchesBeforeCurrentField += fieldMatches.length;
      }
    }
  }

  let matchCounter = 0;
  return text.replace(regex, (match) => {
    const globalMatchIndex = matchesBefore + matchesBeforeCurrentField + matchCounter;
    const isCurrentMatch = globalMatchIndex === currentMatchIndex.value;
    matchCounter++;
    
    if (isCurrentMatch) {
      return `<mark class="search-highlight current-match">${match}</mark>`;
    } else {
      return `<mark class="search-highlight">${match}</mark>`;
    }
  });
};

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const handleSearch = (val) => {
  searchText.value = val;
  autoScroll.value = false;
  if (!searchText.value) {
    searchResults.value = [];
    currentSearchIndex.value = 0;
    currentMatchIndex.value = 0;
    totalMatches.value = 0;
    return;
  }

  const results = [];
  let matchCount = 0;
  const regex = new RegExp(`(${escapeRegExp(searchText.value)})`, "gi");
  
  filteredLogs.value.forEach((log, index) => {
    const str = `${log.location || ''}${log.message || ''}${log.stackTrace || ''}`
    const matches = str?.match(regex);
    if (matches && matches.length > 0) {
      results.push({
        index,
        matches: matches.length,
        startMatch: matchCount
      });
      matchCount += matches.length;
    }
  });

  searchResults.value = results;
  totalMatches.value = matchCount;
  currentSearchIndex.value = 0;
  currentMatchIndex.value = 0;

  if (results.length > 0) {
    let accumulatedMatches = 0;
    for (let i = 0; i < searchResults.value.length; i++) {
      const result = searchResults.value[i];
      if (currentMatchIndex.value < accumulatedMatches + result.matches) {
        currentSearchIndex.value = result.index;
        break;
      }
      accumulatedMatches += result.matches;
    }
    scrollToSearchResult(0);
  }
};

const nextMatch = () => {
  if (totalMatches.value === 0) return;

  currentMatchIndex.value = (currentMatchIndex.value + 1) % totalMatches.value;
  
  // 找到当前匹配项所在的行
  let accumulatedMatches = 0;
  for (let i = 0; i < searchResults.value.length; i++) {
    const result = searchResults.value[i];
    if (currentMatchIndex.value < accumulatedMatches + result.matches) {
      currentSearchIndex.value = i;
      break;
    }
    accumulatedMatches += result.matches;
  }
  
  // 检查并自动展开隐藏内容
  autoExpandForMatch();
  
  scrollToSearchResult(currentSearchIndex.value);
};

const previousMatch = () => {
  if (totalMatches.value === 0) return;

  currentMatchIndex.value = currentMatchIndex.value === 0
    ? totalMatches.value - 1
    : currentMatchIndex.value - 1;
    
  // 找到当前匹配项所在的行
  let accumulatedMatches = 0;
  for (let i = 0; i < searchResults.value.length; i++) {
    const result = searchResults.value[i];
    if (currentMatchIndex.value < accumulatedMatches + result.matches) {
      currentSearchIndex.value = i;
      break;
    }
    accumulatedMatches += result.matches;
  }
  
  // 检查并自动展开隐藏内容
  autoExpandForMatch();
  
  scrollToSearchResult(currentSearchIndex.value);
};

// 新增：自动展开包含当前匹配项的隐藏内容
const autoExpandForMatch = () => {
  const currentResult = searchResults.value[currentSearchIndex.value];
  if (!currentResult) return;
  
  const logIndex = currentResult.index;
  const currentLog = filteredLogs.value[logIndex];
  
  if (!currentLog || !currentLog.stackTrace) return;
  
  // 计算当前匹配项在该日志行中的位置
  let matchesBefore = 0;
  for (const result of searchResults.value) {
    if (result.index < logIndex) {
      matchesBefore += result.matches;
    } else {
      break;
    }
  }
  
  const matchIndexInCurrentLog = currentMatchIndex.value - matchesBefore;
  
  // 计算location和message字段的匹配数量
  const regex = new RegExp(`(${escapeRegExp(searchText.value)})`, "gi");
  let locationMatches = 0;
  let messageMatches = 0;
  
  if (currentLog.location) {
    const locationMatchArray = currentLog.location.match(regex);
    locationMatches = locationMatchArray ? locationMatchArray.length : 0;
  }
  
  if (currentLog.message) {
    const messageMatchArray = currentLog.message.match(regex);
    messageMatches = messageMatchArray ? messageMatchArray.length : 0;
  }
  
  // 如果当前匹配项在stackTrace字段中，且该字段是折叠状态，则自动展开
  const stackTraceStartIndex = locationMatches + messageMatches;
  if (matchIndexInCurrentLog >= stackTraceStartIndex && isCollapsed(logIndex)) {
    collapsedStates.value[logIndex] = false;
  }
};

const scrollToSearchResult = (resultIndex) => {
  const logIndex = searchResults.value[resultIndex]?.index;
  const logElement = logLineRefs.value[logIndex]; 
  if (logElement && logContainer.value) {
    logElement.scrollIntoView({
      behavior: "instant",
      block: "center",
    });
  }
};

const toggleAutoScroll = () => {
  autoScroll.value = true;
  if (autoScroll.value) {
    scrollToBottom();
  }
};

const filterLogs = () => {
  nextTick(() => {
    if (autoScroll.value) {
      scrollToBottom();
    }
    // 重新执行搜索
    if (searchText.value) {
      handleSearch(searchText.value);
    }
  });
};

const handleScroll = () => {
  const container = logContainer.value;
  const isAtBottom =
    container.scrollTop + container.clientHeight >= container.scrollHeight - 10;

  if (!isAtBottom) {
    isUserScrolling.value = true;
    autoScroll.value = false;
  } else {
    isUserScrolling.value = false;
  }
};

const scrollToBottom = () => {
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
      logContainer.value.scrollTo()
    }
  });
};

// 监听日志变化，自动滚动到底部
watch(
  () => logs.value,
  () => {
    // 重置折叠状态（新日志默认折叠）
    nextTick(() => {
      filteredLogs.value.forEach((log, index) => {
        if (
          !(index in collapsedStates.value) &&
          shouldShowToggle(log.stackTrace)
        ) {
          collapsedStates.value[index] = true;
        }
      });
    });

    if (autoScroll.value && !isUserScrolling.value) {
      scrollToBottom();
    }
    // 如果有搜索内容，重新执行搜索
    if (searchText.value) {
      nextTick(() => {
        handleSearch(searchText.value);
      });
    }
  },
  { deep: true }
);

onMounted(() => {
  subscribeData();
})

onBeforeUnmount(() => {
  wsRef.value?.unsubscribe()
})
</script>

<style scoped lang="less">
.console-log {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 12px;

  .console-header {
    padding: 8px;
    background: #fff;
    border-bottom: 1px solid #3e3e42;

    .console-controls {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      select {
        padding: 2px 4px;
        background: #3c3c3c;
        color: #d4d4d4;
        border: 1px solid #5a5a5a;
        border-radius: 2px;
      }

      .search-container {
        position: relative;
        display: flex;
        align-items: center;

        .search-input {

          &::placeholder {
            color: #888;
          }

          &:focus {
            outline: none;
            border-color: #0e639c;
          }
        }

        .clear-search {
          position: absolute;
          right: 4px;
          background: transparent;
          color: #888;
          border: none;
          cursor: pointer;
          padding: 0;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;

          &:hover {
            color: #d4d4d4;
            background: transparent;
          }
        }
      }

      .search-info {
        font-size: 11px;
        color: #888;
        white-space: nowrap;
      }

      .search-navigation {
        display: flex;
        gap: 2px;

        button {
          padding: 2px 6px;
          font-size: 10px;
          min-width: 20px;
        }
      }
    }
  }

  .console-content {
    overflow-y: auto;
    padding: 4px;
    line-height: 1.4;
    height: 500px;
    min-height: 500px;
    .log-line {
      padding: 1px 4px;
      white-space: pre-wrap;
      word-break: break-all;

      &:hover {
        background: #2a2d2e;
      }

      &.search-highlight-line {
        background: rgba(255, 255, 0, 0.1);
      }

      .log-time {
        color: #808080;
        margin-right: 16px;
        min-width: 80px;
      }

      .log-level {
        margin-right: 12px;
        min-width: 50px;
        font-weight: bold;
        display: inline-block;

        &.log-info {
          color: #4ec9b0;
        }

        &.log-warn {
          color: #dcdcaa;
        }

        &.log-error {
          color: #f44747;
        }

        &.log-debug {
          color: #569cd6;
        }
      }

      .log-location {
        color: #22a2a2;
        margin-right: 24px;
      }

      .log-content-wrapper {
        flex: 1;
        display: flex;
        align-items: flex-start;
        gap: 4px;
        margin: 4px 0;
        .log-content {
          width: 100%;
          &.collapsed {
            display: -webkit-box;
            -webkit-line-clamp: 5;
            -webkit-box-orient: vertical;
            overflow: hidden;
            position: relative;
          }
        }
        .collapse-toggle {
          color: #d4d4d4;
          cursor: pointer;
          font-size: 10px;
        }
      }
    }
  }
}
:deep(.search-highlight) {
  background: #ffff0080;
  color: #000;
  padding: 0 2px;
  border-radius: 2px;
  &.current-match {
    background: #ffff00;
    color: #000;
    padding: 0 2px;
    border-radius: 2px;
    border: 1px solid #fff;
  }
}
/* 滚动条样式 */
.console-content::-webkit-scrollbar {
  width: 8px;
}

.console-content::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.console-content::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 4px;
}

.console-content::-webkit-scrollbar-thumb:hover {
  background: #4f4f4f;
}
</style>
