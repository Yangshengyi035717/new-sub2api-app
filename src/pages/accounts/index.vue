<template>
  <PageShell>
    <HeroHeader title="账号" subtitle="查看账号名称、平台类型、今日用量，并支持测试与暂停/恢复。" eyebrow="Accounts">
      <template #right>
        <view class="header-actions">
          <button class="btn btn-ghost btn-small" @tap="openImportSheet">导入JSON</button>
          <button class="btn btn-ghost btn-small" @tap="toggleBatchMode">{{ batchMode ? '退出批量' : '批量分组' }}</button>
          <button class="btn btn-primary btn-small" @tap="goCreate">添加</button>
        </view>
      </template>
    </HeroHeader>

    <SectionCard class="sticky-filter">
      <input v-model="searchText" class="input" placeholder="搜索账号名称 / 平台" @input="handleSearchInput" />

      <view class="filter-grid mt-16">
        <picker mode="selector" :range="platformSelectOptions" range-key="label" :value="selectedOptionIndex(platformSelectOptions, platformFilter)" @change="handlePlatformChange">
          <view class="filter-select">{{ selectedOptionLabel(platformSelectOptions, platformFilter) }}</view>
        </picker>
        <picker mode="selector" :range="typeSelectOptions" range-key="label" :value="selectedOptionIndex(typeSelectOptions, typeFilter)" @change="handleTypeChange">
          <view class="filter-select">{{ selectedOptionLabel(typeSelectOptions, typeFilter) }}</view>
        </picker>
        <picker mode="selector" :range="statusSelectOptions" range-key="label" :value="selectedOptionIndex(statusSelectOptions, statusFilter)" @change="handleStatusChange">
          <view class="filter-select">{{ selectedOptionLabel(statusSelectOptions, statusFilter) }}</view>
        </picker>
        <picker mode="selector" :range="privacySelectOptions" range-key="label" :value="selectedOptionIndex(privacySelectOptions, privacyFilter)" @change="handlePrivacyChange">
          <view class="filter-select">{{ selectedOptionLabel(privacySelectOptions, privacyFilter) }}</view>
        </picker>
        <picker class="filter-picker-wide" mode="selector" :range="groupSelectOptions" range-key="label" :value="selectedOptionIndex(groupSelectOptions, groupFilter)" @change="handleGroupChange">
          <view class="filter-select filter-select-wide">{{ selectedOptionLabel(groupSelectOptions, groupFilter) }}</view>
        </picker>
      </view>

      <view class="account-summary-row mt-16">
        <view class="summary-pill">
          <text class="summary-label">全部</text>
          <text class="summary-value">{{ formatNumber(totalAccounts) }}</text>
        </view>
        <view class="summary-pill">
          <text class="summary-label">已加载</text>
          <text class="summary-value">{{ formatNumber(accounts.length) }}</text>
        </view>
        <view class="summary-pill">
          <text class="summary-label">页码</text>
          <text class="summary-value">{{ currentPageLabel }}</text>
        </view>
      </view>

      <view class="chip-row mt-16">
        <text class="chip usage-chip" :class="usageSort === 'usage-desc' ? 'chip-active' : ''" @tap="usageSort = 'usage-desc'">高→低</text>
        <text class="chip usage-chip" :class="usageSort === 'usage-asc' ? 'chip-active' : ''" @tap="usageSort = 'usage-asc'">低→高</text>
        <text class="chip usage-chip" @tap="resetFilters">重置筛选</text>
      </view>
    </SectionCard>

    <SectionCard v-if="hasAccount" class="batch-card">
      <view class="batch-head">
        <view>
          <text class="batch-title">批量分组</text>
          <text class="batch-subtitle">{{ batchMode ? `已选择 ${formatNumber(selectedAccountIds.length)} 个账号` : '进入批量模式后，可选择当前已加载账号并设置分组。' }}</text>
        </view>
        <button class="btn btn-ghost btn-small" @tap="toggleBatchMode">{{ batchMode ? '完成' : '开始选择' }}</button>
      </view>

      <view v-if="batchMode" class="batch-body">
        <view class="batch-actions">
          <button class="btn btn-ghost btn-small" @tap="selectAllVisibleAccounts">选择当前列表</button>
          <button class="btn btn-ghost btn-small" @tap="clearSelectedAccounts">清空选择</button>
        </view>
        <picker mode="selector" :range="batchGroupOptions" range-key="label" :value="selectedOptionIndex(batchGroupOptions, batchGroupId)" @change="handleBatchGroupChange">
          <view class="filter-select batch-group-select">{{ batchGroupLabel }}</view>
        </picker>
        <text class="batch-tip">批量分组会把选中账号设置为目标分组；如需多分组，请后续在 PC 端细调。</text>
        <button class="btn btn-primary batch-submit" :disabled="!canApplyBatchGroup" :class="!canApplyBatchGroup ? 'btn-disabled' : ''" @tap="applyBatchGroup">
          {{ batchUpdating ? '分组中...' : `设置分组（${formatNumber(selectedAccountIds.length)}）` }}
        </button>
      </view>
    </SectionCard>

    <NoticeBlock v-if="!hasAccount" title="未连接服务器" text="请先到服务器页完成连接，再查看账号列表。" />

    <template v-if="hasAccount">
      <view class="refresh-line">
        <text>{{ loading ? '正在刷新账号...' : lastLoadedAt ? `最近更新 ${formatDisplayTime(lastLoadedAt)}` : '下拉或点击刷新账号' }}</text>
        <button class="btn btn-ghost btn-small" :disabled="loading" :class="loading ? 'btn-disabled' : ''" @tap="refreshData">刷新</button>
      </view>

      <NoticeBlock v-if="initialLoading" text="正在加载账号列表..." />
      <NoticeBlock v-else-if="errorMessage" type="error" :text="errorMessage" />

      <view v-else>
        <view v-if="sortedItems.length">
          <view v-for="account in sortedItems" :key="account.id" class="list-card account-card">
            <view v-if="batchMode" class="batch-select-row" @tap="toggleAccountSelected(account.id)">
              <text class="batch-check" :class="isAccountSelected(account.id) ? 'batch-check-active' : ''">{{ isAccountSelected(account.id) ? '✓' : '' }}</text>
              <text class="batch-select-text">选择此账号</text>
            </view>

            <view class="list-head account-head">
              <view class="account-main">
                <text class="list-title account-title">{{ account.name }}</text>
                <text class="list-meta account-meta">{{ account.platform }} · {{ account.type }} · 优先级 {{ account.priority ?? 0 }} · 倍率 {{ Number(account.rate_multiplier ?? 1).toFixed(2) }}x</text>
              </view>
              <text class="badge account-badge" :class="badgeClass(account)">{{ visualStatus(account).label }}</text>
            </view>

            <view class="metric-row">
              <view class="metric-tile">
                <text class="metric-label">请求次数</text>
                <text class="metric-value">{{ today(account.id).requests }}</text>
              </view>
              <view class="metric-tile">
                <text class="metric-label">消费金额</text>
                <text class="metric-value">{{ formatMoney(today(account.id).cost) }}</text>
              </view>
              <view class="metric-tile">
                <text class="metric-label">Token</text>
                <text class="metric-value">{{ formatTokenValue(today(account.id).tokens) }}</text>
              </view>
            </view>

            <text class="list-meta mt-12">最近使用 {{ formatDisplayTime(account.last_used_at || account.updated_at) }}</text>
            <text v-if="groupsText(account)" class="list-meta">分组 {{ groupsText(account) }}</text>
            <text class="list-meta">Privacy {{ privacyText(account) }}</text>
            <text v-if="account.error_message" class="error-line">异常信息：{{ account.error_message }}</text>

            <view class="model-selector mt-16" :class="modelState(account.id).loading ? 'model-selector-disabled' : ''" @tap="openModelPicker(account)">
              <text class="model-selector-label">测试模型</text>
              <text class="model-selector-value">{{ modelSelectorText(account.id) }}</text>
            </view>

            <view class="btn-row mt-16">
              <button class="btn btn-dark btn-small" :disabled="testingId === account.id" :class="testingId === account.id ? 'btn-disabled' : ''" @tap="handleTest(account)">{{ testingId === account.id ? '测试中...' : '测试' }}</button>
              <button class="btn btn-ghost btn-small" @tap="handleToggle(account)">{{ togglingId === account.id ? '处理中...' : visualStatus(account).filterKey === 'paused' ? '恢复' : '暂停' }}</button>
            </view>
            <text v-if="feedbackById[account.id]" class="list-meta test-feedback mt-12">测试结果：{{ feedbackById[account.id] }}</text>
          </view>

          <button v-if="canLoadMore" class="btn btn-ghost load-more-btn" :disabled="loadingMore" :class="loadingMore ? 'btn-disabled' : ''" @tap="loadNextPage">
            {{ loadingMore ? '正在加载...' : `加载更多（${formatNumber(accounts.length)}/${formatNumber(totalAccounts)}）` }}
          </button>
          <view v-else-if="accounts.length" class="pagination-end">
            <text>已显示全部 {{ formatNumber(totalAccounts) }} 个账号</text>
          </view>
        </view>
        <NoticeBlock v-else text="当前条件下没有账号。" />
      </view>
    </template>

    <view v-if="modelPickerAccount" class="model-sheet-mask" @tap="closeModelPicker">
      <view class="model-sheet" @tap.stop>
        <view class="model-sheet-head">
          <view class="model-sheet-copy">
            <text class="model-sheet-title">选择测试模型</text>
            <text class="model-sheet-subtitle">{{ modelPickerAccount.name }}</text>
          </view>
          <button class="btn btn-ghost btn-small" @tap="closeModelPicker">关闭</button>
        </view>

        <view v-if="activeModelState.loading" class="model-empty">正在加载可用模型...</view>
        <view v-else-if="activeModelState.error" class="model-empty">
          <text class="error-line">{{ activeModelState.error }}</text>
          <button class="btn btn-dark btn-small mt-16" @tap="retryLoadModels">重新加载</button>
        </view>
        <scroll-view v-else-if="activeModelOptions.length" scroll-y class="model-sheet-list">
          <view
            v-for="model in activeModelOptions"
            :key="model.id"
            class="model-option"
            :class="activeModelState.selectedId === model.id ? 'model-option-active' : ''"
            @tap="selectTestModel(model)"
          >
            <view class="model-option-copy">
              <text class="model-option-title">{{ modelDisplayName(model) }}</text>
              <text v-if="modelSubtitle(model)" class="model-option-subtitle">{{ modelSubtitle(model) }}</text>
            </view>
            <text v-if="activeModelState.selectedId === model.id" class="model-option-check">已选</text>
          </view>
        </scroll-view>
        <view v-else class="model-empty">当前账号没有返回可选模型，请检查后台账号模型配置。</view>
      </view>
    </view>

    <view v-if="showImportSheet" class="model-sheet-mask" @tap="closeImportSheet">
      <view class="model-sheet" @tap.stop>
        <view class="model-sheet-head">
          <view class="model-sheet-copy">
            <text class="model-sheet-title">导入账号 JSON</text>
            <text class="model-sheet-subtitle">兼容 PC 端账号数据导入，适合导入 PC 导出的 sub2api-account JSON。</text>
          </view>
          <button class="btn btn-ghost btn-small" :disabled="importingData" @tap="closeImportSheet">关闭</button>
        </view>

        <view class="import-help">
          <text>PC 同款接口：/admin/accounts/data。默认跳过自动绑定默认分组，避免导入后被额外挂到默认分组。</text>
        </view>

        <!-- #ifdef H5 -->
        <view class="file-picker-row">
          <input class="json-file-input" type="file" accept="application/json,.json" @change="handleImportFileChange" />
          <text class="list-meta">{{ importFileName || '可选择 JSON 文件，或直接在下方粘贴 JSON 内容。' }}</text>
        </view>
        <!-- #endif -->

        <!-- #ifndef H5 -->
        <view class="file-picker-row">
          <button class="btn btn-ghost file-picker-action" :disabled="importingData" @tap="chooseImportJsonFile">选择JSON文件</button>
          <text class="list-meta">{{ importFileName || '从手机文件中选择 PC 导出的账号 JSON，或直接在下方粘贴 JSON 内容。' }}</text>
        </view>
        <!-- #endif -->

        <text class="input-label">JSON 内容</text>
        <textarea v-model="importJsonText" class="textarea import-textarea" placeholder='粘贴 PC 导出的账号 JSON，例如 {"accounts":[],"proxies":[]}' />

        <NoticeBlock v-if="importError" type="error" :text="importError" class="mt-16" />

        <view v-if="importResult" class="import-result mt-16">
          <text class="model-sheet-title import-result-title">导入结果</text>
          <text class="list-meta">{{ importResultSummary }}</text>
          <view v-if="importErrorItems.length" class="import-error-list">
            <text v-for="(item, index) in importErrorItems" :key="index" class="error-line">{{ item.kind }} {{ item.name || item.proxy_key || '-' }}：{{ item.message }}</text>
          </view>
        </view>

        <view class="btn-row mt-16">
          <button class="btn btn-primary flex-1" :disabled="importingData" :class="importingData ? 'btn-disabled' : ''" @tap="handleImportData">{{ importingData ? '导入中...' : '开始导入' }}</button>
          <button class="btn btn-ghost flex-1" :disabled="importingData" @tap="resetImportForm">清空</button>
        </view>
      </view>
    </view>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import PageShell from '@/components/uni/PageShell.vue';
import HeroHeader from '@/components/uni/HeroHeader.vue';
import SectionCard from '@/components/uni/SectionCard.vue';
import NoticeBlock from '@/components/uni/NoticeBlock.vue';
import { bulkUpdateAccounts, getAccountModels, getAccountTodayStats, importAccountData, listAccounts, listGroups, setAccountSchedulable, testAccount } from '@/services/admin';
import { adminConfigState, hasAuthenticatedAdminSession } from '@/store/admin-config';
import type { AccountModelOption, AdminAccount, AdminDataImportResult, AdminGroup } from '@/types/admin';
import { formatDisplayTime, formatMoney, formatNumber, formatTokenValue, getErrorMessage } from '@/utils/format';

type AccountStatusFilter = 'all' | 'active' | 'inactive' | 'error' | 'rate_limited' | 'temp_unschedulable' | 'unschedulable';
type UsageSort = 'usage-desc' | 'usage-asc';
type AccountPrivacyFilter = 'all' | '__unset__' | 'training_off' | 'training_set_cf_blocked' | 'training_set_failed';
type AccountVisualFilterKey = 'active' | 'paused' | 'error';
type AccountVisualStatus = {
  filterKey: AccountVisualFilterKey;
  label: '正常' | '暂停' | '异常' | '限流' | '临时禁用' | '不可调度';
  badgeTone: 'success' | 'muted' | 'danger';
};
type TodaySummary = { requests: number; tokens: number; cost: number };
type AccountModelState = {
  loading: boolean;
  loaded: boolean;
  models: AccountModelOption[];
  selectedId: string;
  error: string;
};
type SelectOption<T extends string = string> = { label: string; value: T };
type SelectedJsonFile = File | {
  name?: string;
  path?: string;
  tempFilePath?: string;
  file?: File;
};

const usageSort = ref<UsageSort>('usage-desc');
const searchText = ref('');
const searchTimer = ref<number>();
const loading = ref(false);
const loadingMore = ref(false);
const errorMessage = ref('');
const accounts = ref<AdminAccount[]>([]);
const groups = ref<AdminGroup[]>([]);
const totalAccounts = ref(0);
const currentPage = ref(1);
const totalPages = ref(1);
const pageSize = 20;
const todayById = ref<Record<number, TodaySummary>>({});
const testingId = ref<number | null>(null);
const togglingId = ref<number | null>(null);
const feedbackById = ref<Record<number, string>>({});
const lastLoadedAt = ref('');
const loadedOnce = ref(false);
const loadedConfigKey = ref('');
const modelsByAccountId = ref<Record<number, AccountModelState>>({});
const modelPickerAccount = ref<AdminAccount | null>(null);
const modelPickerRunAfterSelect = ref(false);
const showImportSheet = ref(false);
const importJsonText = ref('');
const importFileName = ref('');
const importResult = ref<AdminDataImportResult | null>(null);
const importError = ref('');
const importingData = ref(false);
const platformFilter = ref('all');
const typeFilter = ref('all');
const statusFilter = ref<AccountStatusFilter>('all');
const privacyFilter = ref<AccountPrivacyFilter>('all');
const groupFilter = ref('all');
const batchMode = ref(false);
const selectedAccountIds = ref<number[]>([]);
const batchGroupId = ref('');
const batchUpdating = ref(false);

const hasAccount = computed(() => hasAuthenticatedAdminSession(adminConfigState));
const initialLoading = computed(() => loading.value && accounts.value.length === 0);
const canLoadMore = computed(() => accounts.value.length < totalAccounts.value && currentPage.value < totalPages.value);
const currentPageLabel = computed(() => `${currentPage.value}/${Math.max(totalPages.value, 1)}`);
const activeModelState = computed(() => (modelPickerAccount.value ? modelState(modelPickerAccount.value.id) : emptyModelState));
const activeModelOptions = computed(() => activeModelState.value.models);
const visibleItems = computed(() => accounts.value.filter(accountMatchesSelectedFilters));
const importErrorItems = computed(() => importResult.value?.errors || []);
const importResultSummary = computed(() => {
  if (!importResult.value) return '';
  const result = importResult.value;
  return `账号创建 ${formatNumber(result.account_created)}，账号失败 ${formatNumber(result.account_failed)}，代理创建 ${formatNumber(result.proxy_created)}，代理复用 ${formatNumber(result.proxy_reused)}，代理失败 ${formatNumber(result.proxy_failed)}`;
});
const batchGroupOptions = computed<SelectOption[]>(() => groups.value.map((group) => ({ label: group.name, value: `${group.id}` })));
const batchGroupLabel = computed(() => batchGroupOptions.value.find((item) => item.value === batchGroupId.value)?.label || '选择目标分组');
const canApplyBatchGroup = computed(() => batchMode.value && !batchUpdating.value && selectedAccountIds.value.length > 0 && Boolean(batchGroupId.value));

const emptyModelState: AccountModelState = {
  loading: false,
  loaded: false,
  models: [],
  selectedId: '',
  error: '',
};
const standardPlatforms = ['anthropic', 'openai', 'gemini', 'sora', 'antigravity'];
const standardTypes = ['apikey', 'oauth', 'setup-token', 'upstream'];
const platformSelectOptions = computed<SelectOption[]>(() => buildStringOptions('全部平台', [...standardPlatforms, ...accounts.value.map((item) => item.platform)]));
const typeSelectOptions = computed<SelectOption[]>(() => buildStringOptions('全部类型', [...standardTypes, ...accounts.value.map((item) => item.type)]));
const statusSelectOptions: SelectOption<AccountStatusFilter>[] = [
  { label: '全部状态', value: 'all' },
  { label: '正常', value: 'active' },
  { label: '停用', value: 'inactive' },
  { label: '异常', value: 'error' },
  { label: '限流', value: 'rate_limited' },
  { label: '临时禁用', value: 'temp_unschedulable' },
  { label: '不可调度', value: 'unschedulable' },
];
const privacySelectOptions: SelectOption<AccountPrivacyFilter>[] = [
  { label: '全部Privacy', value: 'all' },
  { label: '未设置', value: '__unset__' },
  { label: 'Privacy', value: 'training_off' },
  { label: 'CF', value: 'training_set_cf_blocked' },
  { label: 'Fail', value: 'training_set_failed' },
];
const groupSelectOptions = computed<SelectOption[]>(() => [
  { label: '全部分组', value: 'all' },
  { label: '未分组', value: 'ungrouped' },
  ...groups.value.map((group) => ({ label: group.name, value: `${group.id}` })),
]);
const sortedItems = computed(() => [...visibleItems.value].sort((left, right) => {
  const leftRequests = today(left.id).requests;
  const rightRequests = today(right.id).requests;
  if (leftRequests === rightRequests) return today(left.id).tokens - today(right.id).tokens;
  return usageSort.value === 'usage-asc' ? leftRequests - rightRequests : rightRequests - leftRequests;
}));

function buildStringOptions(allLabel: string, values: Array<string | undefined>) {
  const unique = Array.from(new Set(values.map((item) => item?.trim()).filter(Boolean) as string[]));
  return [{ label: allLabel, value: 'all' }, ...unique.map((value) => ({ label: value, value }))];
}

function currentConfigKey() {
  return [adminConfigState.activeAccountId, adminConfigState.baseUrl, searchText.value.trim(), platformFilter.value, typeFilter.value, statusFilter.value, privacyFilter.value, groupFilter.value].join(':');
}

function selectedOptionIndex(options: SelectOption[], value: string) {
  return Math.max(options.findIndex((item) => item.value === value), 0);
}

function selectedOptionLabel(options: SelectOption[], value: string) {
  return options.find((item) => item.value === value)?.label || options[0]?.label || '全部';
}

function selectOption(options: SelectOption[], rawIndex: unknown) {
  const index = Number(rawIndex);
  return options[Number.isFinite(index) ? index : 0]?.value || 'all';
}

function hasAccountError(account: AdminAccount) {
  return Boolean(account.status === 'error' || account.error_message);
}

function accountGroupIds(account: AdminAccount) {
  const ids = [
    ...(account.group_ids || []),
    ...(account.groups?.map((group) => group.id) || []),
  ];
  return Array.from(new Set(ids.map((id) => Number(id)).filter(Number.isFinite)));
}

function accountStatusMatchesFilter(account: AdminAccount) {
  const status = statusFilter.value;
  if (status === 'all') return true;

  const normalizedStatus = `${account.status ?? ''}`.toLowerCase();
  if (status === 'inactive') return normalizedStatus === 'inactive' || normalizedStatus === 'disabled' || normalizedStatus === 'paused' || normalizedStatus === 'stop' || normalizedStatus === 'stopped';
  if (status === 'error') return hasAccountError(account);
  if (status === 'rate_limited') return Boolean(account.rate_limit_reset_at);
  if (status === 'temp_unschedulable') return Boolean(account.temp_unschedulable_until);
  if (status === 'unschedulable') return normalizedStatus === 'active' && account.schedulable === false && !account.rate_limit_reset_at && !account.temp_unschedulable_until;
  return normalizedStatus === status;
}

function accountGroupMatchesFilter(account: AdminAccount) {
  if (groupFilter.value === 'all') return true;
  const groupIds = accountGroupIds(account);
  if (groupFilter.value === 'ungrouped') return groupIds.length === 0;
  return groupIds.includes(Number(groupFilter.value));
}

function accountMatchesSelectedFilters(account: AdminAccount) {
  const search = searchText.value.trim().toLowerCase();
  if (search && !`${account.name} ${account.platform}`.toLowerCase().includes(search)) return false;
  if (platformFilter.value !== 'all' && account.platform !== platformFilter.value) return false;
  if (typeFilter.value !== 'all' && account.type !== typeFilter.value) return false;
  if (!accountStatusMatchesFilter(account)) return false;
  if (privacyFilter.value !== 'all' && accountPrivacyMode(account) !== privacyFilter.value) return false;
  if (!accountGroupMatchesFilter(account)) return false;
  return true;
}

function visualStatus(account: AdminAccount): AccountVisualStatus {
  const normalizedStatus = `${account.status ?? ''}`.toLowerCase();
  const isPausedStatus = normalizedStatus === 'inactive' || normalizedStatus === 'disabled' || normalizedStatus === 'paused' || normalizedStatus === 'stop' || normalizedStatus === 'stopped';

  if (hasAccountError(account)) return { filterKey: 'error', label: '异常', badgeTone: 'danger' };
  if (account.rate_limit_reset_at) return { filterKey: 'paused', label: '限流', badgeTone: 'muted' };
  if (account.temp_unschedulable_until) return { filterKey: 'paused', label: '临时禁用', badgeTone: 'muted' };
  if (normalizedStatus === 'active' && account.schedulable === false) return { filterKey: 'paused', label: '不可调度', badgeTone: 'muted' };
  if (isPausedStatus || account.schedulable === false) return { filterKey: 'paused', label: '暂停', badgeTone: 'muted' };
  return { filterKey: 'active', label: '正常', badgeTone: 'success' };
}

function badgeClass(account: AdminAccount) {
  const tone = visualStatus(account).badgeTone;
  if (tone === 'danger') return 'badge-danger';
  if (tone === 'muted') return 'badge-muted';
  return 'badge-success';
}

function today(accountId: number): TodaySummary {
  return todayById.value[accountId] || { requests: 0, tokens: 0, cost: 0 };
}

function modelState(accountId: number): AccountModelState {
  return modelsByAccountId.value[accountId] || emptyModelState;
}

function setModelState(accountId: number, patch: Partial<AccountModelState>) {
  modelsByAccountId.value = {
    ...modelsByAccountId.value,
    [accountId]: {
      ...modelState(accountId),
      ...patch,
    },
  };
}

function modelDisplayName(model: AccountModelOption) {
  return model.display_name || model.name || model.model || model.id;
}

function modelSubtitle(model: AccountModelOption) {
  const displayName = modelDisplayName(model);
  return displayName === model.id ? '' : model.id;
}

function selectedModelText(accountId: number, modelId: string) {
  const model = modelState(accountId).models.find((item) => item.id === modelId);
  return model ? modelDisplayName(model) : modelId;
}

function modelSelectorText(accountId: number) {
  const state = modelState(accountId);
  if (state.loading) return '正在加载...';
  if (state.selectedId) return selectedModelText(accountId, state.selectedId);
  if (state.loaded && state.models.length === 0) return '无可选模型';
  return '点击选择模型';
}

function groupsText(account: AdminAccount) {
  return account.groups?.map((group) => group.name).filter(Boolean).slice(0, 3).join(' · ') || '';
}

function accountPrivacyMode(account: AdminAccount) {
  const raw = `${account.privacy || account.extra?.privacy_mode || account.extra?.privacy || ''}`.toLowerCase();
  if (!raw || raw === 'shared' || raw === 'false') return '__unset__';
  if (raw === 'private' || raw === 'privacy' || raw === 'privacy_set' || raw === 'true') return 'training_off';
  return raw;
}

function privacyText(account: AdminAccount) {
  const mode = accountPrivacyMode(account);
  if (mode === 'training_off') return 'Privacy';
  if (mode === 'training_set_cf_blocked') return 'CF';
  if (mode === 'training_set_failed') return 'Fail';
  return account.is_private === true ? 'Privacy' : '未设置';
}

async function ensureAccountModels(account: AdminAccount, force = false) {
  const state = modelState(account.id);
  if (!force && state.loaded) return state.models;
  if (state.loading) return state.models;

  setModelState(account.id, { loading: true, error: '' });
  try {
    const models = await getAccountModels(account.id);
    const normalizedModels = (models || []).filter((model) => model.id);
    const selectedId = normalizedModels.some((model) => model.id === state.selectedId) ? state.selectedId : '';
    setModelState(account.id, {
      loading: false,
      loaded: true,
      models: normalizedModels,
      selectedId,
      error: '',
    });
    return normalizedModels;
  } catch (error) {
    const message = getErrorMessage(error, '模型加载失败');
    setModelState(account.id, { loading: false, loaded: true, models: [], selectedId: '', error: message });
    return [];
  }
}

function openModelPicker(account: AdminAccount, runAfterSelect = false) {
  modelPickerAccount.value = account;
  modelPickerRunAfterSelect.value = runAfterSelect;
  void ensureAccountModels(account);
}

function closeModelPicker() {
  modelPickerAccount.value = null;
  modelPickerRunAfterSelect.value = false;
}

function retryLoadModels() {
  if (!modelPickerAccount.value) return;
  void ensureAccountModels(modelPickerAccount.value, true);
}

function selectTestModel(model: AccountModelOption) {
  const account = modelPickerAccount.value;
  if (!account) return;

  const shouldRunTest = modelPickerRunAfterSelect.value;
  setModelState(account.id, { selectedId: model.id });
  closeModelPicker();

  if (shouldRunTest) void runAccountTest(account, model.id);
}

async function loadGroups() {
  try {
    const data = await listGroups('', 1, 100);
    groups.value = data.items || [];
  } catch {
    groups.value = [];
  }
}

async function loadTodayStats(items: AdminAccount[]) {
  const pairs = await Promise.all(
    items.map(async (account) => {
      try {
        const stats = await getAccountTodayStats(account.id);
        return [account.id, {
          requests: Number(stats.requests ?? 0),
          tokens: Number(stats.tokens ?? 0),
          cost: Number(stats.cost ?? 0),
        }] as const;
      } catch {
        const cost = typeof account.extra?.today_cost === 'number' ? account.extra.today_cost : 0;
        return [account.id, { requests: 0, tokens: 0, cost }] as const;
      }
    })
  );
  const nextTodayById = { ...todayById.value };
  pairs.forEach(([accountId, summary]) => {
    nextTodayById[accountId] = summary;
  });
  todayById.value = nextTodayById;
}

function applyAccountPage(data: { items?: AdminAccount[]; total?: number; page?: number; page_size?: number; pages?: number }, append: boolean) {
  const nextItems = data.items || [];
  accounts.value = append ? [...accounts.value, ...nextItems] : nextItems;
  if (!append) {
    const currentIds = new Set(nextItems.map((account) => account.id));
    selectedAccountIds.value = selectedAccountIds.value.filter((accountId) => currentIds.has(accountId));
  }
  totalAccounts.value = Number(data.total ?? accounts.value.length);
  currentPage.value = Number(data.page ?? (append ? currentPage.value + 1 : 1));
  totalPages.value = Number(data.pages ?? Math.max(1, Math.ceil(totalAccounts.value / (data.page_size || pageSize))));
  void loadTodayStats(nextItems);
}

async function loadData(force = false, stopRefresh = false, page = 1, append = false) {
  if (!hasAccount.value) {
    if (stopRefresh) uni.stopPullDownRefresh();
    return;
  }
  if (loading.value || loadingMore.value) {
    if (stopRefresh) uni.stopPullDownRefresh();
    return;
  }
  if (!force && !append && loadedOnce.value && loadedConfigKey.value === currentConfigKey()) return;

  loading.value = !append;
  loadingMore.value = append;
  if (accounts.value.length === 0) errorMessage.value = '';

  try {
    const data = await listAccounts({
      search: searchText.value,
      page,
      pageSize,
      platform: platformFilter.value === 'all' ? undefined : platformFilter.value,
      type: typeFilter.value === 'all' ? undefined : typeFilter.value,
      status: statusFilter.value === 'all' ? undefined : statusFilter.value,
      privacy: privacyFilter.value === 'all' ? undefined : privacyFilter.value,
      groupId: groupFilter.value === 'all' ? undefined : groupFilter.value,
      sortBy: 'name',
      sortOrder: 'asc',
    });
    applyAccountPage(data, append);
    loadedOnce.value = true;
    loadedConfigKey.value = currentConfigKey();
    lastLoadedAt.value = new Date().toISOString();
    errorMessage.value = '';
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
    loadingMore.value = false;
    if (stopRefresh) uni.stopPullDownRefresh();
  }
}

function reloadForFilter() {
  void loadData(true, false, 1, false);
}

function handleSearchInput() {
  if (searchTimer.value) clearTimeout(searchTimer.value);
  searchTimer.value = setTimeout(() => reloadForFilter(), 300) as unknown as number;
}

function handlePlatformChange(event: { detail: { value: unknown } }) {
  platformFilter.value = selectOption(platformSelectOptions.value, event.detail.value);
  reloadForFilter();
}

function handleTypeChange(event: { detail: { value: unknown } }) {
  typeFilter.value = selectOption(typeSelectOptions.value, event.detail.value);
  reloadForFilter();
}

function handleStatusChange(event: { detail: { value: unknown } }) {
  statusFilter.value = selectOption(statusSelectOptions, event.detail.value) as AccountStatusFilter;
  reloadForFilter();
}

function handlePrivacyChange(event: { detail: { value: unknown } }) {
  privacyFilter.value = selectOption(privacySelectOptions, event.detail.value) as AccountPrivacyFilter;
  reloadForFilter();
}

function handleGroupChange(event: { detail: { value: unknown } }) {
  groupFilter.value = selectOption(groupSelectOptions.value, event.detail.value);
  reloadForFilter();
}

function resetFilters() {
  searchText.value = '';
  platformFilter.value = 'all';
  typeFilter.value = 'all';
  statusFilter.value = 'all';
  privacyFilter.value = 'all';
  groupFilter.value = 'all';
  reloadForFilter();
}

function handleTest(account: AdminAccount) {
  if (testingId.value !== null) return;

  const selectedId = modelState(account.id).selectedId;
  if (!selectedId) {
    openModelPicker(account, true);
    return;
  }

  void runAccountTest(account, selectedId);
}

async function runAccountTest(account: AdminAccount, modelId: string) {
  testingId.value = account.id;
  try {
    const result = await testAccount(account.id, modelId);
    const message = result?.message || '测试成功';
    feedbackById.value = { ...feedbackById.value, [account.id]: `${selectedModelText(account.id, modelId)}：${message}` };
  } catch (error) {
    feedbackById.value = { ...feedbackById.value, [account.id]: `${selectedModelText(account.id, modelId)}：${getErrorMessage(error, '测试失败')}` };
  } finally {
    testingId.value = null;
  }
}

async function handleToggle(account: AdminAccount) {
  togglingId.value = account.id;
  try {
    await setAccountSchedulable(account.id, visualStatus(account).filterKey === 'paused');
    await loadData(true);
  } catch (error) {
    uni.showToast({ title: getErrorMessage(error, '操作失败'), icon: 'none' });
  } finally {
    togglingId.value = null;
  }
}

function goCreate() {
  uni.navigateTo({ url: '/pages/accounts/create' });
}

function refreshData() {
  void loadData(true, false, 1, false);
}

function loadNextPage() {
  if (!canLoadMore.value) return;
  void loadData(true, false, currentPage.value + 1, true);
}

function toggleBatchMode() {
  batchMode.value = !batchMode.value;
  if (!batchMode.value) {
    clearSelectedAccounts();
    batchGroupId.value = '';
  }
}

function isAccountSelected(accountId: number) {
  return selectedAccountIds.value.includes(accountId);
}

function toggleAccountSelected(accountId: number) {
  if (isAccountSelected(accountId)) {
    selectedAccountIds.value = selectedAccountIds.value.filter((id) => id !== accountId);
    return;
  }

  selectedAccountIds.value = [...selectedAccountIds.value, accountId];
}

function selectAllVisibleAccounts() {
  const nextIds = new Set(selectedAccountIds.value);
  sortedItems.value.forEach((account) => nextIds.add(account.id));
  selectedAccountIds.value = Array.from(nextIds);
}

function clearSelectedAccounts() {
  selectedAccountIds.value = [];
}

function handleBatchGroupChange(event: { detail: { value: unknown } }) {
  batchGroupId.value = selectOption(batchGroupOptions.value, event.detail.value);
}

async function applyBatchGroup() {
  if (!canApplyBatchGroup.value) return;

  batchUpdating.value = true;
  try {
    await bulkUpdateAccounts(selectedAccountIds.value, {
      group_ids: [Number(batchGroupId.value)],
      confirm_mixed_channel_risk: true,
    });
    uni.showToast({ title: '批量分组完成', icon: 'none' });
    clearSelectedAccounts();
    await loadData(true, false, 1, false);
  } catch (error) {
    uni.showToast({ title: getErrorMessage(error, '批量分组失败'), icon: 'none' });
  } finally {
    batchUpdating.value = false;
  }
}

function openImportSheet() {
  showImportSheet.value = true;
  importError.value = '';
}

function closeImportSheet() {
  if (importingData.value) return;
  showImportSheet.value = false;
}

function resetImportForm() {
  importJsonText.value = '';
  importFileName.value = '';
  importResult.value = null;
  importError.value = '';
}

async function readBrowserFileAsText(file: File) {
  if (typeof file.text === 'function') return file.text();

  if (typeof file.arrayBuffer === 'function') {
    const buffer = await file.arrayBuffer();
    return new TextDecoder().decode(buffer);
  }

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

function readAppFileAsText(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    if (typeof plus === 'undefined' || !plus.io) {
      reject(new Error('当前环境不支持读取本地文件，请粘贴 JSON 内容导入。'));
      return;
    }

    plus.io.resolveLocalFileSystemURL(filePath, (entry) => {
      const fileEntry = entry as PlusIoFileEntry;
      fileEntry.file((file) => {
        const reader = new plus.io.FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsText(file, 'utf-8');
      }, () => reject(new Error('无法打开所选文件。')));
    }, () => reject(new Error('无法访问所选文件。')));
  });
}

function isBrowserFile(value: unknown): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}

async function readSelectedJsonFile(file: SelectedJsonFile) {
  if (isBrowserFile(file)) {
    importFileName.value = file.name;
    return readBrowserFileAsText(file);
  }

  const nestedFile = file.file;
  if (isBrowserFile(nestedFile)) {
    importFileName.value = nestedFile.name || file.name || '';
    return readBrowserFileAsText(nestedFile);
  }

  const path = file.path || file.tempFilePath || '';
  importFileName.value = file.name || path.split(/[\\/]/).pop() || '账号数据.json';
  if (!path) throw new Error('没有获取到文件路径，请粘贴 JSON 内容导入。');
  return readAppFileAsText(path);
}

async function applyImportFile(file: SelectedJsonFile) {
  try {
    importJsonText.value = await readSelectedJsonFile(file);
    importResult.value = null;
    importError.value = '';
  } catch (error) {
    importError.value = getErrorMessage(error, '读取 JSON 文件失败。');
  }
}

async function handleImportFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  await applyImportFile(file);
}

function getChosenFile(result: unknown) {
  const record = (result || {}) as {
    tempFiles?: SelectedJsonFile[] | SelectedJsonFile;
    tempFilePaths?: string[];
  };
  const files = Array.isArray(record.tempFiles) ? record.tempFiles : record.tempFiles ? [record.tempFiles] : [];
  if (files[0]) return files[0];

  const path = Array.isArray(record.tempFilePaths) ? record.tempFilePaths[0] : '';
  return path ? { path } : undefined;
}

function chooseImportJsonFile() {
  importError.value = '';
  const chooseFile = (uni as unknown as { chooseFile?: (options: Record<string, unknown>) => void }).chooseFile;

  if (typeof chooseFile !== 'function') {
    importError.value = '当前 App 运行环境没有可用的系统文件选择器，请直接粘贴 JSON 内容导入。';
    return;
  }

  chooseFile({
    count: 1,
    type: 'all',
    extension: ['.json'],
    success: (result) => {
      const file = getChosenFile(result);
      if (file) void applyImportFile(file);
      else importError.value = '没有获取到可读取的 JSON 文件，请直接粘贴 JSON 内容导入。';
    },
    fail: (error) => {
      const message = getErrorMessage(error, '未选择文件。你也可以直接粘贴 JSON 内容导入。');
      importError.value = message.includes('chooseFile') ? '当前 App 运行环境无法打开文件选择器，请直接粘贴 JSON 内容导入。' : message;
    },
  });
}

async function handleImportData() {
  importError.value = '';
  importResult.value = null;

  if (!importJsonText.value.trim()) {
    importError.value = '请先选择 JSON 文件或粘贴 JSON 内容。';
    return;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(importJsonText.value);
  } catch {
    importError.value = 'JSON 格式不正确，请检查后重试。';
    return;
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    importError.value = '导入内容必须是 PC 导出的 JSON 对象。';
    return;
  }

  importingData.value = true;
  try {
    importResult.value = await importAccountData(payload as Record<string, unknown>, true);
    await loadData(true, false, 1, false);
    uni.showToast({ title: importResult.value.account_failed || importResult.value.proxy_failed ? '导入完成，有失败项' : '导入成功', icon: 'none' });
  } catch (error) {
    importError.value = getErrorMessage(error, '导入账号 JSON 失败。');
  } finally {
    importingData.value = false;
  }
}

onShow(() => {
  if (!hasAccount.value) {
    uni.reLaunch({ url: '/pages/login/index' });
    return;
  }
  void loadGroups();
  void loadData(loadedConfigKey.value !== currentConfigKey());
});

onPullDownRefresh(() => {
  void loadData(true, true, 1, false);
});
</script>

<style scoped>
.header-actions {
  display: flex;
  flex-direction: row;
  gap: 10rpx;
}

.account-summary-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
}

.summary-pill {
  min-width: 0;
  padding: 16rpx;
  border-radius: 24rpx;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.86), rgba(226, 246, 255, 0.68));
  border: 2rpx solid rgba(255, 255, 255, 0.86);
  box-shadow: inset 0 2rpx 0 rgba(255, 255, 255, 0.9);
}

.summary-label,
.summary-value {
  display: block;
}

.summary-label {
  color: #667386;
  font-size: 20rpx;
}

.summary-value {
  margin-top: 6rpx;
  color: #07111f;
  font-size: 28rpx;
  font-weight: 900;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
}

.filter-select {
  min-width: 0;
  height: 72rpx;
  padding: 0 22rpx;
  border-radius: 24rpx;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(226, 246, 255, 0.7));
  border: 2rpx solid rgba(255, 255, 255, 0.86);
  color: #07111f;
  font-size: 23rpx;
  line-height: 72rpx;
  font-weight: 850;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-shadow: inset 0 2rpx 0 rgba(255, 255, 255, 0.9);
}

.filter-picker-wide,
.filter-select-wide {
  grid-column: span 2;
}

.batch-card {
  margin-top: 16rpx;
}

.batch-head {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.batch-title,
.batch-subtitle {
  display: block;
}

.batch-title {
  color: #07111f;
  font-size: 28rpx;
  font-weight: 900;
}

.batch-subtitle {
  margin-top: 6rpx;
  color: #536274;
  font-size: 22rpx;
  line-height: 1.35;
}

.batch-body {
  margin-top: 18rpx;
}

.batch-actions {
  display: flex;
  flex-direction: row;
  gap: 12rpx;
  margin-bottom: 14rpx;
}

.batch-group-select {
  width: 100%;
}

.batch-tip {
  display: block;
  margin-top: 12rpx;
  color: #735922;
  font-size: 21rpx;
  line-height: 1.4;
}

.batch-submit {
  width: 100%;
  margin-top: 16rpx;
}

.account-card {
  overflow: hidden;
}

.batch-select-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
  padding: 14rpx 16rpx;
  border-radius: 20rpx;
  background: rgba(226, 246, 255, 0.72);
  border: 2rpx solid rgba(0, 142, 232, 0.16);
}

.batch-check {
  width: 34rpx;
  height: 34rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(0, 142, 232, 0.45);
  color: #fff;
  font-size: 24rpx;
  line-height: 34rpx;
  text-align: center;
  font-weight: 900;
}

.batch-check-active {
  background: linear-gradient(135deg, #008ee8, #00b7d8);
  border-color: rgba(0, 142, 232, 0.9);
}

.batch-select-text {
  color: #07111f;
  font-size: 23rpx;
  font-weight: 850;
}

.account-head {
  align-items: flex-start;
}

.account-main {
  flex: 1;
  min-width: 0;
}

.account-title,
.account-meta,
.test-feedback {
  display: block;
  max-width: 100%;
  word-break: break-all;
  overflow-wrap: break-word;
}

.account-title {
  line-height: 1.3;
}

.account-badge {
  max-width: 120rpx;
  text-align: center;
}

.load-more-btn {
  width: 100%;
  margin-top: 10rpx;
}

.pagination-end {
  padding: 18rpx 0 8rpx;
  color: #667386;
  text-align: center;
  font-size: 22rpx;
}

.model-selector {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  width: 100%;
  min-height: 74rpx;
  padding: 0 22rpx;
  border-radius: 24rpx;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.86), rgba(226, 246, 255, 0.68));
  border: 2rpx solid rgba(255, 255, 255, 0.86);
  box-shadow: inset 0 2rpx 0 rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.model-selector-disabled {
  opacity: 0.66;
}

.model-selector-label {
  flex-shrink: 0;
  color: #536274;
  font-size: 22rpx;
  font-weight: 800;
}

.model-selector-value {
  flex: 1;
  min-width: 0;
  color: #07111f;
  font-size: 23rpx;
  font-weight: 850;
  text-align: right;
  word-break: break-all;
}

.model-sheet-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 99;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 28rpx;
  background: rgba(7, 17, 31, 0.34);
}

.model-sheet {
  width: 100%;
  max-height: 78vh;
  padding: 28rpx;
  border-radius: 32rpx;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(229, 248, 255, 0.88));
  border: 2rpx solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 -18rpx 70rpx rgba(0, 118, 181, 0.18), inset 0 2rpx 0 rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.model-sheet-head {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.model-sheet-copy {
  flex: 1;
  min-width: 0;
}

.model-sheet-title {
  display: block;
  color: #07111f;
  font-size: 31rpx;
  line-height: 1.25;
  font-weight: 900;
}

.model-sheet-subtitle {
  display: block;
  margin-top: 8rpx;
  color: #536274;
  font-size: 22rpx;
  line-height: 1.35;
  word-break: break-all;
}

.model-sheet-list {
  max-height: 56vh;
}

.model-option {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 14rpx;
  padding: 20rpx;
  border-radius: 24rpx;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.86), rgba(226, 246, 255, 0.68));
  border: 2rpx solid rgba(255, 255, 255, 0.86);
  box-shadow: inset 0 2rpx 0 rgba(255, 255, 255, 0.9);
}

.model-option-active {
  background: linear-gradient(145deg, rgba(218, 244, 255, 0.94), rgba(255, 255, 255, 0.76));
  border-color: rgba(0, 151, 216, 0.36);
}

.model-option-copy {
  flex: 1;
  min-width: 0;
}

.model-option-title {
  display: block;
  color: #07111f;
  font-size: 25rpx;
  line-height: 1.3;
  font-weight: 850;
  word-break: break-all;
}

.model-option-subtitle {
  display: block;
  margin-top: 6rpx;
  color: #536274;
  font-size: 20rpx;
  line-height: 1.3;
  word-break: break-all;
}

.model-option-check {
  flex-shrink: 0;
  color: #008ee8;
  font-size: 22rpx;
  font-weight: 900;
}

.model-empty {
  padding: 28rpx 8rpx;
  color: #536274;
  font-size: 24rpx;
  line-height: 1.45;
  text-align: center;
}

.import-help {
  padding: 18rpx;
  border-radius: 22rpx;
  background: rgba(255, 248, 224, 0.72);
  border: 2rpx solid rgba(245, 176, 65, 0.22);
  color: #735922;
  font-size: 22rpx;
  line-height: 1.45;
}

.file-picker-row {
  margin-top: 18rpx;
  padding: 18rpx;
  border-radius: 22rpx;
  border: 2rpx dashed rgba(0, 142, 232, 0.28);
  background: rgba(255, 255, 255, 0.56);
}

.json-file-input {
  width: 100%;
  margin-bottom: 10rpx;
  font-size: 22rpx;
}

.file-picker-action {
  width: 100%;
  margin-bottom: 10rpx;
}

.import-textarea {
  min-height: 280rpx;
}

.import-result {
  padding: 18rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.62);
  border: 2rpx solid rgba(255, 255, 255, 0.8);
}

.import-result-title {
  font-size: 25rpx;
}

.import-error-list {
  max-height: 220rpx;
  overflow: auto;
}

.error-line {
  display: block;
  margin-top: 12rpx;
  color: #c84942;
  font-size: 23rpx;
  line-height: 1.4;
}
</style>
