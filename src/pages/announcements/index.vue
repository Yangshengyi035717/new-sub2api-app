<template>
  <PageShell>
    <HeroHeader title="公告" subtitle="移动端复用 PC 公告能力，管理标题、状态、提醒方式、展示时间和条件。" eyebrow="Announcements">
      <template #right>
        <button class="btn btn-primary btn-small" @tap="goCreate">创建</button>
      </template>
    </HeroHeader>

    <SectionCard class="sticky-filter">
      <input v-model="searchText" class="input" placeholder="搜索公告标题或内容" @input="handleSearchInput" />
      <view class="filter-grid mt-16">
        <picker mode="selector" :range="statusOptions" range-key="label" :value="selectedOptionIndex(statusOptions, statusFilter)" @change="handleStatusChange">
          <view class="filter-select">{{ selectedOptionLabel(statusOptions, statusFilter) }}</view>
        </picker>
        <view class="filter-select" @tap="resetFilters">重置筛选</view>
      </view>
      <view class="announcement-summary-row mt-16">
        <view class="summary-pill">
          <text class="summary-label">全部</text>
          <text class="summary-value">{{ formatNumber(totalAnnouncements) }}</text>
        </view>
        <view class="summary-pill">
          <text class="summary-label">已加载</text>
          <text class="summary-value">{{ formatNumber(announcements.length) }}</text>
        </view>
        <view class="summary-pill">
          <text class="summary-label">页码</text>
          <text class="summary-value">{{ currentPageLabel }}</text>
        </view>
      </view>
    </SectionCard>

    <NoticeBlock v-if="!hasAccount" title="未连接服务器" text="请先到服务器页完成连接，再查看公告列表。" />

    <template v-if="hasAccount">
      <view class="refresh-line">
        <text>{{ loading ? '正在刷新公告...' : lastLoadedAt ? `最近更新 ${formatDisplayTime(lastLoadedAt)}` : '下拉或点击刷新公告' }}</text>
        <button class="btn btn-ghost btn-small" :disabled="loading" :class="loading ? 'btn-disabled' : ''" @tap="refreshData">刷新</button>
      </view>

      <NoticeBlock v-if="initialLoading" text="正在加载公告列表..." />
      <NoticeBlock v-else-if="errorMessage" type="error" :text="errorMessage" />

      <view v-else>
        <view v-if="announcements.length">
          <view v-for="item in announcements" :key="item.id" class="list-card announcement-card">
            <view class="list-head announcement-head">
              <view class="flex-1">
                <text class="list-title announcement-title">{{ item.title }}</text>
                <text class="list-meta">#{{ item.id }} · 创建 {{ formatDisplayTime(item.created_at) }}</text>
              </view>
              <text class="badge" :class="statusBadgeClass(item.status)">{{ statusLabel(item.status) }}</text>
            </view>

            <text class="announcement-content">{{ contentPreview(item.content) }}</text>

            <view class="meta-grid">
              <view class="meta-tile">
                <text class="metric-label">通知方式</text>
                <text class="metric-value">{{ notifyModeLabel(item.notify_mode) }}</text>
              </view>
              <view class="meta-tile">
                <text class="metric-label">展示条件</text>
                <text class="metric-value">{{ targetingSummary(item.targeting) }}</text>
              </view>
            </view>

            <text class="list-meta mt-12">开始 {{ item.starts_at ? formatDisplayTime(item.starts_at) : '立即生效' }}</text>
            <text class="list-meta">结束 {{ item.ends_at ? formatDisplayTime(item.ends_at) : '永久生效' }}</text>

            <view class="btn-row mt-16">
              <button class="btn btn-dark btn-small" @tap="goEdit(item.id)">编辑</button>
              <button class="btn btn-danger btn-small" @tap="handleDelete(item)">删除</button>
            </view>
          </view>

          <button v-if="canLoadMore" class="btn btn-ghost load-more-btn" :disabled="loadingMore" :class="loadingMore ? 'btn-disabled' : ''" @tap="loadNextPage">
            {{ loadingMore ? '正在加载...' : `加载更多（${formatNumber(announcements.length)}/${formatNumber(totalAnnouncements)}）` }}
          </button>
          <view v-else-if="announcements.length" class="pagination-end">
            <text>已显示全部 {{ formatNumber(totalAnnouncements) }} 条公告</text>
          </view>
        </view>
        <NoticeBlock v-else text="当前筛选条件下没有公告，可以创建一条新的公告。" />
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
import { deleteAnnouncement, listAnnouncements } from '@/services/admin';
import { adminConfigState, hasAuthenticatedAdminSession } from '@/store/admin-config';
import type { AdminAnnouncement, AnnouncementTargeting } from '@/types/admin';
import { formatDisplayTime, formatNumber, getErrorMessage } from '@/utils/format';

const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'active' },
  { label: '已归档', value: 'archived' },
];

const searchText = ref('');
const searchTimer = ref<number>();
const statusFilter = ref('all');
const loading = ref(false);
const loadingMore = ref(false);
const errorMessage = ref('');
const announcements = ref<AdminAnnouncement[]>([]);
const totalAnnouncements = ref(0);
const currentPage = ref(1);
const totalPages = ref(1);
const pageSize = 20;
const lastLoadedAt = ref('');
const loadedConfigKey = ref('');
const loadedOnce = ref(false);

const hasAccount = computed(() => hasAuthenticatedAdminSession(adminConfigState));
const initialLoading = computed(() => loading.value && announcements.value.length === 0);
const canLoadMore = computed(() => announcements.value.length < totalAnnouncements.value && currentPage.value < totalPages.value);
const currentPageLabel = computed(() => `${currentPage.value}/${Math.max(totalPages.value, 1)}`);

function currentConfigKey() {
  return `${adminConfigState.activeAccountId}:${adminConfigState.baseUrl}:${statusFilter.value}:${searchText.value.trim()}`;
}

function selectedOptionIndex(options: Array<{ value: string }>, value: string) {
  return Math.max(options.findIndex((item) => item.value === value), 0);
}

function selectedOptionLabel(options: Array<{ label: string; value: string }>, value: string) {
  return options.find((item) => item.value === value)?.label || options[0]?.label || '全部状态';
}

function statusLabel(status?: string) {
  if (status === 'active') return '已发布';
  if (status === 'archived') return '已归档';
  return '草稿';
}

function statusBadgeClass(status?: string) {
  if (status === 'active') return 'badge-success';
  if (status === 'archived') return 'badge-warning';
  return 'badge-muted';
}

function notifyModeLabel(mode?: string) {
  return mode === 'popup' ? '弹窗' : '静默';
}

function targetingSummary(targeting?: AnnouncementTargeting) {
  const groups = targeting?.any_of || [];
  if (!groups.length) return '所有用户';
  return `${groups.length} 个条件组`;
}

function contentPreview(content: string) {
  const text = content.replace(/\s+/g, ' ').trim();
  return text.length > 120 ? `${text.slice(0, 120)}...` : text || '无内容';
}

function applyPage(data: { items?: AdminAnnouncement[]; total?: number; page?: number; page_size?: number; pages?: number }, append: boolean) {
  const nextItems = data.items || [];
  announcements.value = append ? [...announcements.value, ...nextItems] : nextItems;
  totalAnnouncements.value = Number(data.total ?? announcements.value.length);
  currentPage.value = Number(data.page ?? (append ? currentPage.value + 1 : 1));
  totalPages.value = Number(data.pages ?? Math.max(1, Math.ceil(totalAnnouncements.value / (data.page_size || pageSize))));
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
  if (announcements.value.length === 0) errorMessage.value = '';

  try {
    const data = await listAnnouncements({
      page,
      pageSize,
      search: searchText.value,
      status: statusFilter.value === 'all' ? undefined : statusFilter.value,
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
    applyPage(data, append);
    loadedOnce.value = true;
    loadedConfigKey.value = currentConfigKey();
    lastLoadedAt.value = new Date().toISOString();
    errorMessage.value = '';
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '加载公告失败，请检查服务地址、Admin Key 和网络。');
  } finally {
    loading.value = false;
    loadingMore.value = false;
    if (stopRefresh) uni.stopPullDownRefresh();
  }
}

function handleSearchInput() {
  if (searchTimer.value) clearTimeout(searchTimer.value);
  searchTimer.value = setTimeout(() => void loadData(true, false, 1, false), 300) as unknown as number;
}

function handleStatusChange(event: { detail: { value: number | string } }) {
  const index = Number(event.detail.value);
  statusFilter.value = statusOptions[Number.isFinite(index) ? index : 0]?.value || 'all';
  void loadData(true, false, 1, false);
}

function resetFilters() {
  searchText.value = '';
  statusFilter.value = 'all';
  void loadData(true, false, 1, false);
}

function refreshData() {
  void loadData(true, false, 1, false);
}

function loadNextPage() {
  if (!canLoadMore.value) return;
  void loadData(true, false, currentPage.value + 1, true);
}

function goCreate() {
  uni.navigateTo({ url: '/pages/announcements/edit' });
}

function goEdit(id: number) {
  uni.navigateTo({ url: `/pages/announcements/edit?id=${id}` });
}

function handleDelete(item: AdminAnnouncement) {
  uni.showModal({
    title: '删除公告',
    content: `确认删除「${item.title}」吗？`,
    success: async (result) => {
      if (!result.confirm) return;
      try {
        await deleteAnnouncement(item.id);
        uni.showToast({ title: '已删除', icon: 'success' });
        void loadData(true, false, 1, false);
      } catch (error) {
        uni.showToast({ title: getErrorMessage(error, '删除失败'), icon: 'none' });
      }
    },
  });
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

.announcement-summary-row,
.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
}

.announcement-summary-row {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.summary-pill,
.meta-tile {
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

.announcement-head {
  align-items: flex-start;
}

.announcement-title {
  display: block;
  word-break: break-all;
}

.announcement-content {
  display: block;
  margin: 18rpx 0;
  color: #33435a;
  font-size: 24rpx;
  line-height: 1.48;
  word-break: break-word;
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

.badge-warning {
  background: linear-gradient(145deg, rgba(255, 248, 223, 0.96), rgba(255, 255, 255, 0.78));
  color: #b87900;
}
</style>
