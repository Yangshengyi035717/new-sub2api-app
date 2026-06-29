<template>
  <PageShell>
    <HeroHeader title="账号" subtitle="查看账号名称、平台类型、今日用量，并支持测试与暂停/恢复。" eyebrow="Accounts">
      <template #right>
        <button class="btn btn-primary btn-small" @tap="goCreate">添加</button>
      </template>
    </HeroHeader>

    <SectionCard class="sticky-filter">
      <input v-model="searchText" class="input" placeholder="搜索账号名称 / 平台" @input="handleSearchInput" />
      <view class="chip-row mt-16">
        <text v-for="item in filterOptions" :key="item.key" class="chip" :class="filter === item.key ? 'chip-active' : ''" @tap="filter = item.key">{{ item.label }}</text>
      </view>
      <view class="chip-row mt-16">
        <text class="chip" :class="usageSort === 'usage-desc' ? 'chip-active' : ''" @tap="usageSort = 'usage-desc'">请求高→低</text>
        <text class="chip" :class="usageSort === 'usage-asc' ? 'chip-active' : ''" @tap="usageSort = 'usage-asc'">请求低→高</text>
      </view>
    </SectionCard>

    <view class="refresh-line">
      <text>{{ loading ? '正在刷新账号...' : lastLoadedAt ? `最近更新 ${formatDisplayTime(lastLoadedAt)}` : '下拉或点击刷新账号' }}</text>
      <button class="btn btn-ghost btn-small" :disabled="loading" :class="loading ? 'btn-disabled' : ''" @tap="refreshData">刷新</button>
    </view>

    <NoticeBlock v-if="initialLoading" text="正在加载账号列表..." />
    <NoticeBlock v-else-if="errorMessage" type="error" :text="errorMessage" />

    <view v-else>
      <view v-if="filteredItems.length">
        <view v-for="account in filteredItems" :key="account.id" class="list-card account-card">
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
      </view>
      <NoticeBlock v-else text="当前条件下没有账号。" />
    </view>

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
  </PageShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import PageShell from '@/components/uni/PageShell.vue';
import HeroHeader from '@/components/uni/HeroHeader.vue';
import SectionCard from '@/components/uni/SectionCard.vue';
import NoticeBlock from '@/components/uni/NoticeBlock.vue';
import { getAccountModels, getAccountTodayStats, listAccounts, setAccountSchedulable, testAccount } from '@/services/admin';
import { adminConfigState, hasAuthenticatedAdminSession } from '@/store/admin-config';
import type { AccountModelOption, AccountTodayStats, AdminAccount } from '@/types/admin';
import { formatDisplayTime, formatMoney, formatTokenValue, getErrorMessage } from '@/utils/format';

type AccountStatusFilter = 'all' | 'active' | 'paused' | 'error';
type UsageSort = 'usage-desc' | 'usage-asc';
type AccountVisualStatus = {
  filterKey: AccountStatusFilter;
  label: '正常' | '暂停' | '异常';
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

const filter = ref<AccountStatusFilter>('all');
const usageSort = ref<UsageSort>('usage-desc');
const searchText = ref('');
const searchTimer = ref<number>();
const loading = ref(false);
const errorMessage = ref('');
const accounts = ref<AdminAccount[]>([]);
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

const emptyModelState: AccountModelState = {
  loading: false,
  loaded: false,
  models: [],
  selectedId: '',
  error: '',
};

const filterOptions = computed(() => [
  { key: 'all' as const, label: `全部 ${accounts.value.length}` },
  { key: 'active' as const, label: `正常 ${accounts.value.filter((item) => visualStatus(item).filterKey === 'active').length}` },
  { key: 'paused' as const, label: `暂停 ${accounts.value.filter((item) => visualStatus(item).filterKey === 'paused').length}` },
  { key: 'error' as const, label: `异常 ${accounts.value.filter((item) => visualStatus(item).filterKey === 'error').length}` },
]);

const filteredItems = computed(() => {
  const matched = accounts.value.filter((account) => filter.value === 'all' || visualStatus(account).filterKey === filter.value);
  return [...matched].sort((left, right) => {
    const leftRequests = today(left.id).requests;
    const rightRequests = today(right.id).requests;
    if (leftRequests === rightRequests) return today(left.id).tokens - today(right.id).tokens;
    return usageSort.value === 'usage-asc' ? leftRequests - rightRequests : rightRequests - leftRequests;
  });
});
const initialLoading = computed(() => loading.value && accounts.value.length === 0);
const activeModelState = computed(() => (modelPickerAccount.value ? modelState(modelPickerAccount.value.id) : emptyModelState));
const activeModelOptions = computed(() => activeModelState.value.models);

function currentConfigKey() {
  return `${adminConfigState.activeAccountId}:${adminConfigState.baseUrl}`;
}

function getAccountError(account: AdminAccount) {
  return Boolean(account.status === 'error' || account.error_message);
}

function visualStatus(account: AdminAccount): AccountVisualStatus {
  const normalizedStatus = `${account.status ?? ''}`.toLowerCase();
  const isPausedStatus = normalizedStatus === 'inactive' || normalizedStatus === 'disabled' || normalizedStatus === 'paused' || normalizedStatus === 'stop' || normalizedStatus === 'stopped';

  if (getAccountError(account)) return { filterKey: 'error', label: '异常', badgeTone: 'danger' };
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

async function loadData(force = false, stopRefresh = false) {
  if (!hasAuthenticatedAdminSession(adminConfigState)) {
    if (stopRefresh) uni.stopPullDownRefresh();
    return;
  }
  if (loading.value) {
    if (stopRefresh) uni.stopPullDownRefresh();
    return;
  }
  if (!force && loadedOnce.value && loadedConfigKey.value === currentConfigKey()) return;

  loading.value = true;
  if (accounts.value.length === 0) errorMessage.value = '';

  try {
    const data = await listAccounts(searchText.value);
    accounts.value = data.items || [];
    const pairs = await Promise.all(
      accounts.value.map(async (account) => {
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
    const nextTodayById: Record<number, TodaySummary> = {};
    pairs.forEach(([accountId, summary]) => {
      nextTodayById[accountId] = summary;
    });
    todayById.value = nextTodayById;
    loadedOnce.value = true;
    loadedConfigKey.value = currentConfigKey();
    lastLoadedAt.value = new Date().toISOString();
    errorMessage.value = '';
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
    if (stopRefresh) uni.stopPullDownRefresh();
  }
}

function handleSearchInput() {
  if (searchTimer.value) clearTimeout(searchTimer.value);
  searchTimer.value = setTimeout(() => void loadData(true), 300) as unknown as number;
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
  void loadData(true);
}

onShow(() => {
  if (!hasAuthenticatedAdminSession(adminConfigState)) {
    uni.reLaunch({ url: '/pages/login/index' });
    return;
  }
  void loadData(loadedConfigKey.value !== currentConfigKey());
});

onPullDownRefresh(() => {
  void loadData(true, true);
});
</script>

<style scoped>
.account-card {
  overflow: hidden;
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
  background: rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.model-selector-disabled {
  opacity: 0.66;
}

.model-selector-label {
  flex-shrink: 0;
  color: #64748b;
  font-size: 22rpx;
  font-weight: 800;
}

.model-selector-value {
  flex: 1;
  min-width: 0;
  color: #0f172a;
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
  background: rgba(15, 23, 42, 0.38);
}

.model-sheet {
  width: 100%;
  max-height: 78vh;
  padding: 28rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 -18rpx 70rpx rgba(15, 23, 42, 0.12);
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
  color: #0f172a;
  font-size: 31rpx;
  line-height: 1.25;
  font-weight: 900;
}

.model-sheet-subtitle {
  display: block;
  margin-top: 8rpx;
  color: #64748b;
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
  background: rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.model-option-active {
  background: rgba(37, 99, 235, 0.15);
  border-color: rgba(147, 197, 253, 0.6);
}

.model-option-copy {
  flex: 1;
  min-width: 0;
}

.model-option-title {
  display: block;
  color: #0f172a;
  font-size: 25rpx;
  line-height: 1.3;
  font-weight: 850;
  word-break: break-all;
}

.model-option-subtitle {
  display: block;
  margin-top: 6rpx;
  color: #64748b;
  font-size: 20rpx;
  line-height: 1.3;
  word-break: break-all;
}

.model-option-check {
  flex-shrink: 0;
  color: #2563eb;
  font-size: 22rpx;
  font-weight: 900;
}

.model-empty {
  padding: 28rpx 8rpx;
  color: #64748b;
  font-size: 24rpx;
  line-height: 1.45;
  text-align: center;
}

.error-line {
  display: block;
  margin-top: 12rpx;
  color: #b91c1c;
  font-size: 23rpx;
  line-height: 1.4;
}
</style>
