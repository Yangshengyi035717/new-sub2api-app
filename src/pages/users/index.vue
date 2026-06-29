<template>
  <PageShell>
    <HeroHeader title="用户" subtitle="查看用户列表、按最近活动排序，并进入详情管理 Key、余额和状态。" eyebrow="Users">
      <template #right>
        <button class="btn btn-primary btn-small" @tap="goCreate">添加</button>
      </template>
    </HeroHeader>

    <SectionCard class="sticky-filter">
      <input v-model="searchText" class="input" placeholder="搜索邮箱、用户名或备注" @input="handleSearchInput" />
      <view class="user-summary-row mt-16">
        <view class="summary-pill">
          <text class="summary-label">用户总数</text>
          <text class="summary-value">{{ formatNumber(totalUsers) }}</text>
        </view>
        <view class="summary-pill">
          <text class="summary-label">已加载</text>
          <text class="summary-value">{{ formatNumber(users.length) }}</text>
        </view>
        <view class="summary-pill">
          <text class="summary-label">页码</text>
          <text class="summary-value">{{ currentPageLabel }}</text>
        </view>
      </view>
      <view class="chip-row mt-16">
        <text class="chip" :class="sortOrder === 'desc' ? 'chip-active' : ''" @tap="sortOrder = 'desc'">最近优先</text>
        <text class="chip" :class="sortOrder === 'asc' ? 'chip-active' : ''" @tap="sortOrder = 'asc'">较早优先</text>
      </view>
    </SectionCard>

    <view v-if="hasAccount" class="refresh-line">
      <text>{{ loading ? '正在刷新用户...' : lastLoadedAt ? `最近更新 ${formatDisplayTime(lastLoadedAt)}` : '下拉或点击刷新用户' }}</text>
      <button class="btn btn-ghost btn-small" :disabled="loading" :class="loading ? 'btn-disabled' : ''" @tap="refreshData">刷新</button>
    </view>

    <NoticeBlock v-if="!hasAccount" title="未连接服务器" text="请先到服务器页完成连接，再查看用户列表。" />
    <NoticeBlock v-else-if="initialLoading" text="正在加载用户列表..." />
    <NoticeBlock v-else-if="errorMessage" type="error" :text="errorMessage" />

    <view v-else>
      <view v-if="sortedUsers.length">
        <view v-for="user in sortedUsers" :key="user.id" class="list-card" @tap="goDetail(user.id)">
          <view class="list-head">
            <view class="flex-1">
              <text class="list-title">{{ user.email }}</text>
              <text class="list-meta">{{ getUserNameLabel(user) }} · 最近 {{ formatDisplayTime(user.last_used_at || user.updated_at || user.created_at) }}</text>
            </view>
            <text class="badge" :class="user.status === 'disabled' || user.status === 'inactive' ? 'badge-muted' : 'badge-success'">
              {{ user.role === 'admin' ? 'admin · ' : '' }}{{ user.status || 'active' }}
            </text>
          </view>
          <view class="metric-row">
            <view class="metric-tile">
              <text class="metric-label">余额</text>
              <text class="metric-value">{{ formatMoney(user.balance) }}</text>
            </view>
            <view class="metric-tile">
              <text class="metric-label">并发</text>
              <text class="metric-value">{{ formatNumber(user.current_concurrency ?? user.concurrency ?? 0) }}</text>
            </view>
            <view class="metric-tile">
              <text class="metric-label">用户 ID</text>
              <text class="metric-value">#{{ user.id }}</text>
            </view>
          </view>
        </view>
        <button v-if="canLoadMore" class="btn btn-ghost load-more-btn" :disabled="loadingMore" :class="loadingMore ? 'btn-disabled' : ''" @tap="loadNextPage">
          {{ loadingMore ? '正在加载...' : `加载更多（${formatNumber(users.length)}/${formatNumber(totalUsers)}）` }}
        </button>
        <view v-else-if="users.length" class="pagination-end">
          <text>已显示全部 {{ formatNumber(totalUsers) }} 个用户</text>
        </view>
      </view>
      <NoticeBlock v-else text="当前搜索条件下没有匹配用户，可以换个关键词。" />
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
import { listUsers } from '@/services/admin';
import { adminConfigState, hasAuthenticatedAdminSession } from '@/store/admin-config';
import type { AdminUser } from '@/types/admin';
import { formatDisplayTime, formatMoney, formatNumber, getErrorMessage, toTimeValue } from '@/utils/format';

const searchText = ref('');
const searchTimer = ref<number>();
const sortOrder = ref<'desc' | 'asc'>('desc');
const loading = ref(false);
const loadingMore = ref(false);
const errorMessage = ref('');
const users = ref<AdminUser[]>([]);
const totalUsers = ref(0);
const currentPage = ref(1);
const totalPages = ref(1);
const pageSize = 20;
const lastLoadedAt = ref('');
const loadedOnce = ref(false);
const loadedConfigKey = ref('');
const hasAccount = computed(() => hasAuthenticatedAdminSession(adminConfigState));
const initialLoading = computed(() => loading.value && users.value.length === 0);
const canLoadMore = computed(() => users.value.length < totalUsers.value && currentPage.value < totalPages.value);
const currentPageLabel = computed(() => `${currentPage.value}/${Math.max(totalPages.value, 1)}`);

function currentConfigKey() {
  return `${adminConfigState.activeAccountId}:${adminConfigState.baseUrl}`;
}

const sortedUsers = computed(() => {
  const items = [...users.value];
  items.sort((left, right) => {
    const diff = getTimeValue(left) - getTimeValue(right);
    return sortOrder.value === 'desc' ? -diff : diff;
  });
  return items;
});

function getTimeValue(user: AdminUser) {
  return toTimeValue(user.last_used_at) || toTimeValue(user.last_active_at) || toTimeValue(user.updated_at) || toTimeValue(user.created_at) || user.id || 0;
}

function getUserNameLabel(user: AdminUser) {
  if (user.username?.trim()) return user.username.trim();
  if (user.notes?.trim()) return user.notes.trim();
  return user.email.split('@')[0] || '未命名';
}

function applyUserPage(data: { items?: AdminUser[]; total?: number; page?: number; page_size?: number; pages?: number }, append: boolean) {
  const nextItems = data.items || [];
  users.value = append ? [...users.value, ...nextItems] : nextItems;
  totalUsers.value = Number(data.total ?? users.value.length);
  currentPage.value = Number(data.page ?? (append ? currentPage.value + 1 : 1));
  totalPages.value = Number(data.pages ?? Math.max(1, Math.ceil(totalUsers.value / (data.page_size || pageSize))));
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
  if (users.value.length === 0) errorMessage.value = '';

  try {
    const data = await listUsers(searchText.value, page, pageSize);
    applyUserPage(data, append);
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

function handleSearchInput() {
  if (searchTimer.value) clearTimeout(searchTimer.value);
  searchTimer.value = setTimeout(() => void loadData(true), 300) as unknown as number;
}

function goCreate() {
  uni.navigateTo({ url: '/pages/users/create-user' });
}

function goDetail(userId: number) {
  uni.navigateTo({ url: `/pages/users/detail?id=${userId}` });
}

function refreshData() {
  void loadData(true, false, 1, false);
}

function loadNextPage() {
  if (!canLoadMore.value) return;
  void loadData(true, false, currentPage.value + 1, true);
}

onShow(() => {
  if (!hasAccount.value) {
    uni.reLaunch({ url: '/pages/login/index' });
    return;
  }
  void loadData(loadedConfigKey.value !== currentConfigKey());
});

onPullDownRefresh(() => {
  void loadData(true, true, 1, false);
});
</script>

<style scoped>
.user-summary-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
}

.summary-pill {
  min-width: 0;
  padding: 16rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.summary-label,
.summary-value {
  display: block;
}

.summary-label {
  color: #94a3b8;
  font-size: 20rpx;
}

.summary-value {
  margin-top: 6rpx;
  color: #0f172a;
  font-size: 28rpx;
  font-weight: 900;
}

.load-more-btn {
  width: 100%;
  margin-top: 10rpx;
}

.pagination-end {
  padding: 18rpx 0 8rpx;
  color: #94a3b8;
  text-align: center;
  font-size: 22rpx;
}
</style>
