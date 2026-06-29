<template>
  <PageShell>
    <HeroHeader :title="user?.email || '用户详情'" subtitle="查看用量、API Keys，并管理余额与状态。" eyebrow="User Detail" />

    <NoticeBlock v-if="loading" text="正在加载用户详情..." />
    <NoticeBlock v-else-if="errorMessage" type="error" :text="errorMessage" />

    <view v-if="user && !loading">
      <SectionCard title="基础信息">
        <view class="stat-grid">
          <StatCard label="用户名" :value="user.username || '--'" />
          <StatCard label="余额" :value="formatMoney(user.balance)" />
          <StatCard label="状态" :value="user.status || 'active'" />
          <StatCard label="最近使用" :value="formatDisplayTime(user.last_used_at || user.updated_at || user.created_at)" />
        </view>
        <view class="btn-row mt-16">
          <button class="btn" :class="user.status === 'disabled' ? 'btn-primary' : 'btn-danger'" :disabled="statusSubmitting || user.role?.toLowerCase() === 'admin'" @tap="toggleStatus">
            {{ statusSubmitting ? '处理中...' : user.status === 'disabled' ? '启用用户' : '禁用用户' }}
          </button>
        </view>
        <NoticeBlock v-if="statusError" type="error" :text="statusError" class="mt-16" />
      </SectionCard>

      <SectionCard title="总用量" :subtitle="`${range.start_date} 到 ${range.end_date}`">
        <view class="chip-row mb-16">
          <text v-for="item in rangeOptions" :key="item.key" class="chip" :class="rangeKey === item.key ? 'chip-active' : ''" @tap="setRange(item.key)">{{ item.label }}</text>
        </view>
        <view class="stat-grid">
          <StatCard label="请求" :value="formatTokenValue(usageStats?.total_requests)" />
          <StatCard label="Token" :value="formatTokenValue(usageStats?.total_tokens)" />
          <StatCard label="成本" :value="formatMoney(usageCost, 4)" />
          <StatCard label="平均耗时" :value="usageStats?.average_duration_ms ? `${Math.round(usageStats.average_duration_ms)}ms` : '--'" />
        </view>
      </SectionCard>

      <MiniTrend title="用量趋势" :subtitle="`${range.start_date} 到 ${range.end_date}`" :points="trendPoints" color="#2563eb" />

      <SectionCard title="API Keys">
        <input v-model="keySearch" class="input mb-16" placeholder="搜索名称 / Key / 分组" />
        <view v-if="filteredApiKeys.length">
          <view v-for="item in filteredApiKeys" :key="item.id" class="list-card">
            <view class="list-head">
              <view class="flex-1">
                <text class="list-title">{{ item.name || `Key #${item.id}` }}</text>
                <text class="list-meta">{{ item.group?.name || '未分组' }} · 最后 {{ formatDisplayTime(item.last_used_at || item.updated_at || item.created_at) }}</text>
              </view>
              <text class="badge" :class="item.status === 'active' ? 'badge-success' : 'badge-muted'">{{ item.status || '--' }}</text>
            </view>
            <text class="key-text">{{ item.key || '--' }}</text>
            <view class="btn-row mt-16">
              <button class="btn btn-ghost btn-small" @tap="copyKey(item.key)">{{ copiedKey === item.key ? '已复制' : '复制 Key' }}</button>
              <text class="list-meta">额度 {{ formatQuotaUsage(item.quota_used, item.quota) }}</text>
            </view>
          </view>
        </view>
        <NoticeBlock v-else text="当前筛选条件下没有 Key。" />
      </SectionCard>

      <SectionCard title="余额操作">
        <view class="chip-row mb-16">
          <text class="chip" :class="operation === 'add' ? 'chip-active' : ''" @tap="operation = 'add'">充值</text>
          <text class="chip" :class="operation === 'subtract' ? 'chip-active' : ''" @tap="operation = 'subtract'">扣减</text>
          <text class="chip" :class="operation === 'set' ? 'chip-active' : ''" @tap="operation = 'set'">设为</text>
        </view>
        <text class="input-label">金额</text>
        <input v-model="amount" class="input" type="digit" placeholder="例如：10" />
        <text class="input-label">备注（可选）</text>
        <input v-model="notes" class="input" placeholder="备注" />
        <NoticeBlock v-if="balanceError" type="error" :text="balanceError" class="mt-16" />
        <button class="btn btn-dark mt-16" :disabled="balanceSubmitting" :class="balanceSubmitting ? 'btn-disabled' : ''" @tap="submitBalance">
          {{ balanceSubmitting ? '提交中...' : '确认提交' }}
        </button>
      </SectionCard>
    </view>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import PageShell from '@/components/uni/PageShell.vue';
import HeroHeader from '@/components/uni/HeroHeader.vue';
import SectionCard from '@/components/uni/SectionCard.vue';
import StatCard from '@/components/uni/StatCard.vue';
import MiniTrend from '@/components/uni/MiniTrend.vue';
import NoticeBlock from '@/components/uni/NoticeBlock.vue';
import { getDashboardSnapshot, getUsageStats, getUser, listUserApiKeys, updateUserBalance, updateUserStatus } from '@/services/admin';
import type { AdminApiKey, AdminUser, BalanceOperation, UsageStats } from '@/types/admin';
import { formatDisplayTime, formatMoney, formatTokenValue, getDateRange, getErrorMessage, getPointLabel, type RangeKey } from '@/utils/format';

const rangeOptions: Array<{ key: RangeKey; label: string }> = [
  { key: '24h', label: '24H' },
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
];

const userId = ref(0);
const user = ref<AdminUser>();
const apiKeys = ref<AdminApiKey[]>([]);
const usageStats = ref<UsageStats>();
const trend = ref<Array<{ date: string; total_tokens: number }>>([]);
const loading = ref(false);
const errorMessage = ref('');
const rangeKey = ref<RangeKey>('7d');
const keySearch = ref('');
const copiedKey = ref('');
const operation = ref<BalanceOperation>('add');
const amount = ref('10');
const notes = ref('');
const balanceError = ref('');
const statusError = ref('');
const balanceSubmitting = ref(false);
const statusSubmitting = ref(false);

const range = computed(() => getDateRange(rangeKey.value));
const usageCost = computed(() => Number(usageStats.value?.total_account_cost ?? usageStats.value?.total_actual_cost ?? usageStats.value?.total_cost ?? 0));
const trendPoints = computed(() => trend.value.map((item) => ({ label: getPointLabel(item.date, rangeKey.value), value: item.total_tokens })));
const filteredApiKeys = computed(() => {
  const keyword = keySearch.value.trim().toLowerCase();
  return apiKeys.value.filter((item) => {
    const haystack = [item.name, item.key, item.group?.name].filter(Boolean).join(' ').toLowerCase();
    return keyword ? haystack.includes(keyword) : true;
  });
});

function formatQuotaUsage(quotaUsed?: number | null, quota?: number | null) {
  const used = Number(quotaUsed ?? 0);
  const limit = Number(quota ?? 0);
  if (limit <= 0) return '∞';
  return `${used}/${limit}`;
}

async function loadData() {
  if (!Number.isFinite(userId.value) || userId.value <= 0) {
    errorMessage.value = '用户 ID 不正确。';
    return;
  }

  loading.value = true;
  errorMessage.value = '';
  const currentRange = range.value;

  try {
    const [userData, keyData, statsData, snapshotData] = await Promise.all([
      getUser(userId.value),
      listUserApiKeys(userId.value),
      getUsageStats({ ...currentRange, user_id: userId.value }),
      getDashboardSnapshot({
        ...currentRange,
        user_id: userId.value,
        include_stats: false,
        include_trend: true,
        include_model_stats: false,
        include_group_stats: false,
        include_users_trend: false,
      }),
    ]);

    user.value = userData;
    apiKeys.value = keyData.items || [];
    usageStats.value = statsData;
    trend.value = snapshotData.trend || [];
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '加载用户详情失败，请稍后重试。');
  } finally {
    loading.value = false;
  }
}

function setRange(next: RangeKey) {
  rangeKey.value = next;
  void loadData();
}

function copyKey(key: string) {
  uni.setClipboardData({
    data: key || '',
    success: () => {
      copiedKey.value = key;
      setTimeout(() => {
        if (copiedKey.value === key) copiedKey.value = '';
      }, 1500);
    },
  });
}

function toggleStatus() {
  if (!user.value) return;
  const nextStatus: 'active' | 'disabled' = user.value.status === 'disabled' ? 'active' : 'disabled';
  const actionLabel = nextStatus === 'disabled' ? '禁用' : '启用';

  uni.showModal({
    title: `${actionLabel}用户`,
    content: `确认要${actionLabel}该用户吗？`,
    success: async (result) => {
      if (!result.confirm) return;
      statusSubmitting.value = true;
      statusError.value = '';
      try {
        user.value = await updateUserStatus(userId.value, nextStatus);
      } catch (error) {
        statusError.value = getErrorMessage(error, '状态更新失败。');
      } finally {
        statusSubmitting.value = false;
      }
    },
  });
}

async function submitBalance() {
  const numericAmount = Number(amount.value);

  if (!amount.value.trim()) {
    balanceError.value = '请输入金额。';
    return;
  }

  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    balanceError.value = '金额格式不正确。';
    return;
  }

  balanceSubmitting.value = true;
  balanceError.value = '';

  try {
    user.value = await updateUserBalance(userId.value, {
      balance: numericAmount,
      operation: operation.value,
      notes: notes.value.trim() || undefined,
    });
    amount.value = '10';
    notes.value = '';
  } catch (error) {
    balanceError.value = getErrorMessage(error, '余额提交失败。');
  } finally {
    balanceSubmitting.value = false;
  }
}

onLoad((query) => {
  userId.value = Number(query?.id);
  void loadData();
});
</script>

<style scoped>
.key-text {
  display: block;
  margin-top: 18rpx;
  padding: 18rpx;
  border-radius: 18rpx;
  background: #f8fafc;
  color: #334155;
  font-size: 22rpx;
  line-height: 1.4;
  word-break: break-all;
}
</style>
