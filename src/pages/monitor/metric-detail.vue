<template>
  <PageShell>
    <HeroHeader :title="pageTitle" :subtitle="`${range.start_date} 到 ${range.end_date} · ${pageSubtitle}`" eyebrow="Metric Detail">
      <template #right>
        <button class="btn btn-ghost btn-small" @tap="goBack">返回</button>
      </template>
    </HeroHeader>

    <view v-if="hasAccount" class="refresh-line">
      <text>{{ loading ? '正在刷新明细...' : lastLoadedAt ? `最近更新 ${formatDisplayTime(lastLoadedAt)}` : '下拉或点击刷新明细' }}</text>
      <button class="btn btn-ghost btn-small" :disabled="loading" :class="loading ? 'btn-disabled' : ''" @tap="refreshData">刷新</button>
    </view>

    <NoticeBlock v-if="!hasAccount" title="未连接服务器" text="请先到服务器页完成连接，再查看指标明细。" />
    <NoticeBlock v-else-if="initialLoading" text="正在加载指标明细..." />
    <NoticeBlock v-else-if="errorMessage" type="error" :text="errorMessage" />

    <view v-else>
      <view class="detail-hero-card" :class="detailToneClass">
        <view>
          <text class="detail-label">{{ primaryLabel }}</text>
          <text class="detail-value">{{ primaryValue }}</text>
          <text class="detail-desc">{{ primaryDesc }}</text>
        </view>
        <view class="detail-mini-stack">
          <text>{{ secondaryLabel }}</text>
          <text>{{ secondaryValue }}</text>
        </view>
      </view>

      <view class="detail-grid">
        <view v-for="item in summaryItems" :key="item.label" class="summary-card">
          <text class="summary-label">{{ item.label }}</text>
          <text class="summary-value">{{ item.value }}</text>
          <text class="summary-desc">{{ item.desc }}</text>
        </view>
      </view>

      <SectionCard :title="chartTitle" :subtitle="chartSubtitle">
        <view class="chart-panel">
          <qiun-data-charts :type="chartType" canvas-id="metric-detail-chart" :chart-data="chartData" :opts="chartOpts" background="none" />
        </view>
      </SectionCard>

      <SectionCard v-if="metricType === 'request'" title="请求落点" subtitle="按当前时间范围展示最近请求趋势点和模型请求 Top。">
        <view v-if="topModels.length">
          <view v-for="model in topModels" :key="model.model" class="list-card compact-card">
            <view class="list-head">
              <view class="flex-1">
                <text class="list-title">{{ model.model }}</text>
                <text class="list-meta">请求 {{ formatNumber(model.requests) }} · Token {{ formatTokenValue(model.total_tokens) }}</text>
              </view>
              <text class="badge">{{ formatMoney(model.cost) }}</text>
            </view>
          </view>
        </view>
        <NoticeBlock v-else text="暂无模型请求统计。" />
      </SectionCard>

      <SectionCard v-else-if="metricType === 'sla'" title="SLA 组成" subtitle="SLA 根据账号健康、异常、限流和当前流量综合估算。">
        <view class="sla-stack">
          <view class="sla-row">
            <text>健康账号</text>
            <text class="health-ok">{{ formatNumber(healthyAccounts) }}</text>
          </view>
          <view class="sla-row">
            <text>异常账号</text>
            <text class="health-danger">{{ formatNumber(errorAccounts) }}</text>
          </view>
          <view class="sla-row">
            <text>限流账号</text>
            <text class="health-warning">{{ formatNumber(limitedAccounts) }}</text>
          </view>
        </view>
        <button class="btn btn-primary mt-16" @tap="goAccounts">查看账号清单</button>
      </SectionCard>

      <SectionCard v-else-if="metricType === 'errors'" title="异常账号" subtitle="优先处理带错误信息或被限流的账号。">
        <view v-if="riskAccounts.length">
          <view v-for="account in riskAccounts" :key="account.id" class="list-card compact-card">
            <view class="list-head">
              <view class="flex-1">
                <text class="list-title">{{ account.name }}</text>
                <text class="list-meta">{{ account.platform }} · {{ account.type }} · {{ account.error_message || '可能处于限流状态' }}</text>
              </view>
              <text class="badge badge-danger">风险</text>
            </view>
          </view>
        </view>
        <NoticeBlock v-else text="当前没有检测到异常账号。" />
        <button class="btn btn-primary mt-16" @tap="goAccounts">进入账号页处理</button>
      </SectionCard>

      <SectionCard v-else title="成本落点" subtitle="按模型展示当前范围内成本贡献，辅助定位主要消耗。">
        <view v-if="topModelsByCost.length">
          <view v-for="model in topModelsByCost" :key="model.model" class="list-card compact-card">
            <view class="list-head">
              <view class="flex-1">
                <text class="list-title">{{ model.model }}</text>
                <text class="list-meta">请求 {{ formatNumber(model.requests) }} · Token {{ formatTokenValue(model.total_tokens) }}</text>
              </view>
              <text class="badge">{{ formatMoney(model.cost) }}</text>
            </view>
          </view>
        </view>
        <NoticeBlock v-else text="暂无成本模型统计。" />
      </SectionCard>
    </view>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import PageShell from '@/components/uni/PageShell.vue';
import HeroHeader from '@/components/uni/HeroHeader.vue';
import SectionCard from '@/components/uni/SectionCard.vue';
import NoticeBlock from '@/components/uni/NoticeBlock.vue';
import QiunDataCharts from '@/components/qiun-data-charts/qiun-data-charts.vue';
import { getDashboardModels, getDashboardStats, getDashboardTrend, listAccounts } from '@/services/admin';
import { adminConfigState, hasAuthenticatedAdminSession } from '@/store/admin-config';
import type { AdminAccount, DashboardModelStats, DashboardStats, DashboardTrend } from '@/types/admin';
import { formatDisplayTime, formatMoney, formatNumber, formatTokenValue, getDateRange, getErrorMessage, getPointLabel, type RangeKey } from '@/utils/format';

type MetricType = 'request' | 'sla' | 'errors' | 'cost';

const metricType = ref<MetricType>('request');
const rangeKey = ref<RangeKey>('7d');
const loading = ref(false);
const errorMessage = ref('');
const stats = ref<DashboardStats>();
const accounts = ref<AdminAccount[]>([]);
const accountsTotal = ref(0);
const trend = ref<DashboardTrend['trend']>([]);
const models = ref<DashboardModelStats['models']>([]);
const lastLoadedAt = ref('');
const loadedConfigKey = ref('');

const hasAccount = computed(() => hasAuthenticatedAdminSession(adminConfigState));
const range = computed(() => getDateRange(rangeKey.value));
const initialLoading = computed(() => loading.value && !stats.value && !trend.value.length);
const totalAccounts = computed(() => stats.value?.total_accounts ?? accountsTotal.value ?? accounts.value.length);
const errorAccounts = computed(() => Math.max(stats.value?.error_accounts ?? 0, accounts.value.filter(hasAccountError).length));
const limitedAccounts = computed(() => accounts.value.filter(hasAccountRateLimited).length);
const healthyAccounts = computed(() => stats.value?.normal_accounts ?? Math.max(totalAccounts.value - errorAccounts.value, 0));
const healthScore = computed(() => {
  const total = Math.max(totalAccounts.value, 1);
  const errorPenalty = Math.round((errorAccounts.value / total) * 45);
  const limitedPenalty = Math.round((limitedAccounts.value / total) * 20);
  const noTrafficPenalty = Number(stats.value?.today_requests ?? 0) > 0 ? 0 : 8;
  return Math.max(0, Math.min(100, 100 - errorPenalty - limitedPenalty - noTrafficPenalty));
});
const errorRate = computed(() => (totalAccounts.value ? (errorAccounts.value / totalAccounts.value) * 100 : 0));
const topModels = computed(() => [...models.value].sort((a, b) => Number(b.requests ?? 0) - Number(a.requests ?? 0)).slice(0, 5));
const topModelsByCost = computed(() => [...models.value].sort((a, b) => Number(b.cost ?? 0) - Number(a.cost ?? 0)).slice(0, 5));
const riskAccounts = computed(() => accounts.value.filter((account) => hasAccountError(account) || hasAccountRateLimited(account)).slice(0, 8));
const trendSource = computed(() => trend.value.length ? trend.value : [{ date: '暂无', requests: 0, total_tokens: 0, cost: 0, input_tokens: 0, output_tokens: 0, cache_creation_tokens: 0, cache_read_tokens: 0, actual_cost: 0 }]);
const chartCategories = computed(() => trendSource.value.map((item) => getPointLabel(item.date, rangeKey.value)));

const pageTitle = computed(() => ({ request: '请求明细', sla: 'SLA 明细', errors: '请求错误明细', cost: '今日成本明细' }[metricType.value]));
const pageSubtitle = computed(() => ({ request: '请求量、Token 与模型落点', sla: '健康分、异常和限流组成', errors: '异常账号与错误比例', cost: '成本趋势与模型贡献' }[metricType.value]));
const detailToneClass = computed(() => metricType.value === 'errors' ? 'detail-danger' : metricType.value === 'sla' && healthScore.value < 85 ? 'detail-warning' : '');
const primaryLabel = computed(() => ({ request: '今日请求', sla: 'SLA 健康分', errors: '请求错误率', cost: '今日成本' }[metricType.value]));
const primaryValue = computed(() => {
  if (metricType.value === 'request') return formatNumber(stats.value?.today_requests);
  if (metricType.value === 'sla') return `${healthScore.value.toFixed(2)}%`;
  if (metricType.value === 'errors') return `${errorRate.value.toFixed(2)}%`;
  return formatMoney(stats.value?.today_cost);
});
const primaryDesc = computed(() => {
  if (metricType.value === 'request') return `今日 Token ${formatTokenValue(stats.value?.today_tokens)} · QPS ${formatNumber(stats.value?.rpm)}`;
  if (metricType.value === 'sla') return `健康 ${formatNumber(healthyAccounts.value)} · 异常 ${formatNumber(errorAccounts.value)} · 限流 ${formatNumber(limitedAccounts.value)}`;
  if (metricType.value === 'errors') return `异常账号 ${formatNumber(errorAccounts.value)} · 总账号 ${formatNumber(totalAccounts.value)}`;
  return `总成本 ${formatMoney(stats.value?.total_cost)} · 当前范围按趋势统计`;
});
const secondaryLabel = computed(() => metricType.value === 'cost' ? '模型成本 Top' : '当前 TPS');
const secondaryValue = computed(() => metricType.value === 'cost' ? formatMoney(topModelsByCost.value[0]?.cost) : formatNumber(stats.value?.tpm));
const summaryItems = computed(() => [
  { label: '总请求', value: formatNumber(stats.value?.total_requests), desc: '历史累计' },
  { label: '今日 Token', value: formatTokenValue(stats.value?.today_tokens), desc: '输入/输出合计' },
  { label: '账号总数', value: formatNumber(totalAccounts.value), desc: `健康 ${formatNumber(healthyAccounts.value)}` },
  { label: '今日成本', value: formatMoney(stats.value?.today_cost), desc: `累计 ${formatMoney(stats.value?.total_cost)}` },
]);
const chartTitle = computed(() => metricType.value === 'cost' ? '成本趋势' : metricType.value === 'request' ? '请求趋势' : metricType.value === 'sla' ? '健康趋势参考' : '错误趋势参考');
const chartSubtitle = computed(() => metricType.value === 'cost' ? '按当前时间范围展示成本走势。' : '按当前时间范围展示请求量走势。');
const chartType = computed(() => metricType.value === 'cost' ? 'line' : 'column');
const chartData = computed(() => ({
  categories: chartCategories.value,
  series: [{
    name: metricType.value === 'cost' ? '成本' : '请求',
    data: trendSource.value.map((item) => Number(metricType.value === 'cost' ? item.cost : item.requests) || 0),
    color: metricType.value === 'errors' ? '#DC2626' : '#2563EB',
  }],
}));
const chartOpts = {
  color: ['#2563EB', '#10B981', '#DC2626'],
  padding: [10, 10, 0, 4],
  dataLabel: false,
  dataPointShape: false,
  legend: { show: false },
  xAxis: { disableGrid: true, fontColor: '#94A3B8', axisLine: false },
  yAxis: { gridType: 'dash', dashLength: 4, data: [{ fontColor: '#94A3B8' }] },
  extra: {
    column: { type: 'group', width: 18, activeBgOpacity: 0.08 },
    line: { type: 'curve', width: 3, activeType: 'hollow' },
  },
};

function currentConfigKey() {
  return `${adminConfigState.activeAccountId}:${adminConfigState.baseUrl}:${rangeKey.value}:${metricType.value}`;
}

function hasAccountError(account: AdminAccount) {
  return Boolean(account.status === 'error' || account.error_message);
}

function hasAccountRateLimited(account: AdminAccount) {
  if (account.rate_limit_reset_at) {
    const resetTime = new Date(account.rate_limit_reset_at).getTime();
    if (!Number.isNaN(resetTime) && resetTime > Date.now()) return true;
  }
  return false;
}

async function loadData(force = false, stopRefresh = false) {
  if (!hasAccount.value) {
    if (stopRefresh) uni.stopPullDownRefresh();
    return;
  }
  if (loading.value) {
    if (stopRefresh) uni.stopPullDownRefresh();
    return;
  }
  if (!force && loadedConfigKey.value === currentConfigKey()) return;

  loading.value = true;
  errorMessage.value = '';
  const currentRange = range.value;

  try {
    const [statsData, accountsData, trendData, modelsData] = await Promise.all([
      getDashboardStats(),
      listAccounts(''),
      getDashboardTrend(currentRange),
      getDashboardModels({ start_date: currentRange.start_date, end_date: currentRange.end_date }),
    ]);
    stats.value = statsData;
    accounts.value = accountsData.items || [];
    accountsTotal.value = accountsData.total || accounts.value.length;
    trend.value = trendData.trend || [];
    models.value = modelsData.models || [];
    loadedConfigKey.value = currentConfigKey();
    lastLoadedAt.value = new Date().toISOString();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    loading.value = false;
    if (stopRefresh) uni.stopPullDownRefresh();
  }
}

function refreshData() {
  void loadData(true);
}

function goBack() {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/monitor/index' }) });
}

function goAccounts() {
  uni.switchTab({ url: '/pages/accounts/index' });
}

onLoad((query) => {
  const type = typeof query?.type === 'string' ? query.type : '';
  if (type === 'sla' || type === 'errors' || type === 'cost' || type === 'request') metricType.value = type;
  const range = typeof query?.range === 'string' ? query.range : '';
  if (range === '24h' || range === '7d' || range === '30d') rangeKey.value = range;
});

onShow(() => {
  if (!hasAccount.value) {
    uni.reLaunch({ url: '/pages/login/index' });
    return;
  }
  void loadData();
});

onPullDownRefresh(() => {
  void loadData(true, true);
});
</script>

<style scoped>
.detail-hero-card {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 20rpx;
  margin-bottom: 22rpx;
  padding: 32rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 8rpx 48rpx rgba(15, 23, 42, 0.05);
  backdrop-filter: blur(12px);
}

.detail-danger {
  border-color: rgba(220, 38, 38, 0.3);
}

.detail-warning {
  border-color: rgba(217, 119, 6, 0.3);
}

.detail-label,
.detail-desc,
.summary-label,
.summary-desc {
  display: block;
  color: #94a3b8;
  font-size: 22rpx;
  line-height: 1.45;
}

.detail-value {
  display: block;
  margin-top: 8rpx;
  color: #1d4ed8;
  font-size: 54rpx;
  line-height: 1.1;
  font-weight: 950;
}

.detail-desc {
  margin-top: 10rpx;
  color: #475569;
}

.detail-mini-stack {
  flex-shrink: 0;
  min-width: 150rpx;
  padding: 18rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(147, 197, 253, 0.6);
  color: #1d4ed8;
  font-size: 22rpx;
  font-weight: 850;
  text-align: right;
}

.detail-mini-stack text {
  display: block;
}

.detail-mini-stack text + text {
  margin-top: 8rpx;
  font-size: 30rpx;
  font-weight: 950;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
  margin-bottom: 22rpx;
}

.summary-card {
  min-width: 0;
  padding: 24rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 8rpx 48rpx rgba(15, 23, 42, 0.05);
}

.summary-value {
  display: block;
  margin-top: 8rpx;
  color: #0f172a;
  font-size: 36rpx;
  font-weight: 950;
}

.summary-desc {
  margin-top: 8rpx;
}

.chart-panel {
  height: 380rpx;
}

.compact-card {
  margin-bottom: 12rpx;
  box-shadow: none;
}

.sla-stack {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.sla-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 18rpx 20rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.45);
  color: #475569;
  font-size: 24rpx;
  font-weight: 850;
}

.health-ok {
  color: #059669;
}

.health-warning {
  color: #d97706;
}

.health-danger {
  color: #dc2626;
}
</style>
