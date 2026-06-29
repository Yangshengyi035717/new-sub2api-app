<template>
  <PageShell>
    <HeroHeader title="分组" subtitle="查看分组、平台、倍率、订阅类型和账号归属。" eyebrow="Groups" />

    <SectionCard class="sticky-filter">
      <input v-model="searchText" class="input" placeholder="搜索分组名称" @input="handleSearchInput" />
    </SectionCard>

    <NoticeBlock v-if="!hasAccount" title="未连接服务器" text="请先到服务器页完成连接，再查看分组列表。" />

    <template v-if="hasAccount">
    <view class="refresh-line">
      <text>{{ loading ? '正在刷新分组...' : lastLoadedAt ? `最近更新 ${formatDisplayTime(lastLoadedAt)}` : '下拉或点击刷新分组' }}</text>
      <button class="btn btn-ghost btn-small" :disabled="loading" :class="loading ? 'btn-disabled' : ''" @tap="refreshData">刷新</button>
    </view>

    <NoticeBlock v-if="initialLoading" text="正在加载分组列表..." />
    <NoticeBlock v-else-if="errorMessage" type="error" :text="errorMessage" />

    <view v-else>
      <view v-if="groups.length">
        <view v-for="group in groups" :key="group.id" class="list-card">
          <view class="list-head">
            <view class="flex-1">
              <text class="list-title">{{ group.name }}</text>
              <text class="list-meta">{{ group.platform }}</text>
            </view>
            <text class="badge" :class="group.status === 'disabled' ? 'badge-muted' : 'badge-success'">{{ group.status || 'active' }}</text>
          </view>
          <view class="group-meta-row">
            <text class="list-meta">订阅 {{ group.subscription_type || 'standard' }} · 倍率 {{ group.rate_multiplier ?? 1 }}x</text>
            <text v-if="group.description" class="list-meta">{{ group.description }}</text>
          </view>
          <view class="metric-row">
            <view class="metric-tile">
              <text class="metric-label">账号数</text>
              <text class="metric-value">{{ group.account_count ?? 0 }}</text>
            </view>
            <view class="metric-tile">
              <text class="metric-label">模式</text>
              <text class="metric-value">{{ group.is_exclusive ? '独占' : '共享' }}</text>
            </view>
            <view class="metric-tile">
              <text class="metric-label">日限额</text>
              <text class="metric-value">{{ group.daily_limit_usd ? formatMoney(group.daily_limit_usd) : '--' }}</text>
            </view>
          </view>
          <view v-if="group.weekly_limit_usd || group.monthly_limit_usd" class="metric-row">
            <view class="metric-tile">
              <text class="metric-label">周限额</text>
              <text class="metric-value">{{ group.weekly_limit_usd ? formatMoney(group.weekly_limit_usd) : '--' }}</text>
            </view>
            <view class="metric-tile">
              <text class="metric-label">月限额</text>
              <text class="metric-value">{{ group.monthly_limit_usd ? formatMoney(group.monthly_limit_usd) : '--' }}</text>
            </view>
            <view class="metric-tile">
              <text class="metric-label">排序</text>
              <text class="metric-value">{{ group.sort_order ?? 0 }}</text>
            </view>
          </view>
          <text class="list-meta mt-12">创建 {{ formatDisplayTime(group.created_at) }}</text>
        </view>
      </view>
      <NoticeBlock v-else text="连上 Sub2API 后，这里会展示分组列表。" />
    </view>
    </template>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import PageShell from '@/components/uni/PageShell.vue';
import HeroHeader from '@/components/uni/HeroHeader.vue';
import SectionCard from '@/components/uni/SectionCard.vue';
import NoticeBlock from '@/components/uni/NoticeBlock.vue';
import { listGroups } from '@/services/admin';
import { adminConfigState, hasAuthenticatedAdminSession } from '@/store/admin-config';
import type { AdminGroup } from '@/types/admin';
import { formatDisplayTime, formatMoney, getErrorMessage } from '@/utils/format';

const searchText = ref('');
const searchTimer = ref<number>();
const loading = ref(false);
const errorMessage = ref('');
const groups = ref<AdminGroup[]>([]);
const lastLoadedAt = ref('');
const loadedOnce = ref(false);
const loadedConfigKey = ref('');
const hasAccount = computed(() => hasAuthenticatedAdminSession(adminConfigState));
const initialLoading = computed(() => loading.value && groups.value.length === 0);

function currentConfigKey() {
  return `${adminConfigState.activeAccountId}:${adminConfigState.baseUrl}`;
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
  if (groups.value.length === 0) errorMessage.value = '';

  try {
    const data = await listGroups(searchText.value);
    groups.value = data.items || [];
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
.group-meta-row {
  margin-bottom: 8rpx;
}
</style>