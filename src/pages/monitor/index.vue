<template>
  <PageShell>
    <HeroHeader :title="siteName" :subtitle="`${range.start_date} 到 ${range.end_date} 的运行状态`" eyebrow="Dashboard">
      <template #right>
        <view class="range-pills">
          <text v-for="item in rangeOptions" :key="item.key" class="chip" :class="rangeKey === item.key ? 'chip-active' : ''" @tap="setRange(item.key)">{{ item.label }}</text>
        </view>
      </template>
    </HeroHeader>

    <view v-if="hasAccount" class="refresh-line">
      <text>{{ loading ? '正在刷新数据...' : lastLoadedAt ? `最近更新 ${formatDisplayTime(lastLoadedAt)}` : '下拉或点击刷新数据' }}</text>
      <button class="btn btn-ghost btn-small" :disabled="loading" :class="loading ? 'btn-disabled' : ''" @tap="refreshData">刷新</button>
    </view>

    <NoticeBlock v-if="!hasAccount" title="未连接服务器" text="请先前往服务器页填写服务地址和 Admin Key，再返回查看概览数据。" />
    <NoticeBlock v-else-if="initialLoading" text="正在拉取概览、模型和账号状态数据..." />
    <NoticeBlock v-else-if="errorMessage" type="error" :text="errorMessage" />

    <view v-if="hasAccount && !initialLoading && (!errorMessage || hasDashboardData)">
      <SectionCard title="实时健康" subtitle="参考后台运维监控面板，聚合健康、吞吐与资源状态。">
        <view class="ops-overview">
          <view class="health-block">
            <view class="health-ring">
              <qiun-data-charts type="arcbar" canvas-id="monitor-health-arc" :chart-data="healthArcChartData" :opts="healthArcOpts" background="none" />
              <view class="health-core">
                <text class="health-score">{{ healthScore }}</text>
                <text class="health-label">{{ healthLabel }}</text>
              </view>
            </view>
            <text class="health-title">健康状况</text>
            <text class="health-risk" :class="healthToneClass">{{ healthRiskText }}</text>
          </view>

          <view class="realtime-block">
            <view class="live-dot-row">
              <view class="live-dot"></view>
              <text>实时信息</text>
              <text class="info-muted">当前</text>
            </view>
            <view class="live-metrics">
              <view>
                <text class="live-number">{{ formatNumber(stats?.rpm) }}</text>
                <text class="live-label">QPS</text>
              </view>
              <view>
                <text class="live-number">{{ formatNumber(stats?.tpm) }}</text>
                <text class="live-label">TPS</text>
              </view>
            </view>
            <view class="sparkline-wrap">
              <qiun-data-charts type="area" canvas-id="monitor-sparkline" :chart-data="sparklineChartData" :opts="sparklineOpts" background="none" />
            </view>
          </view>
        </view>
      </SectionCard>

      <view class="ops-card-grid">
        <view v-for="metric in metricCards" :key="metric.label" class="ops-metric-card ops-metric-clickable" :class="metric.tone ? `ops-metric-${metric.tone}` : ''" @tap="goMetricDetail(metric.key)">
          <view class="metric-topline">
            <text class="metric-card-label">{{ metric.label }}</text>
            <text class="metric-link">明细</text>
          </view>
          <text class="metric-card-value">{{ metric.value }}</text>
          <text class="metric-card-detail">{{ metric.detail }}</text>
        </view>
      </view>

      <SectionCard title="账号概览" subtitle="总数、健康、异常和限流状态一览">
        <template #right>
          <button class="btn btn-ghost btn-small" @tap="goAccounts">账号清单</button>
        </template>
        <view class="account-health-grid">
          <view class="account-health-main">
            <qiun-data-charts type="ring" canvas-id="monitor-account-ring" :chart-data="accountRingChartData" :opts="ringOpts" background="none" />
          </view>
          <view class="account-health-list">
            <view class="health-row">
              <text>健康</text>
              <text class="health-ok">{{ formatNumber(healthyAccounts) }}</text>
            </view>
            <view class="health-row">
              <text>异常</text>
              <text class="health-danger">{{ formatNumber(errorAccounts) }}</text>
            </view>
            <view class="health-row">
              <text>限流</text>
              <text class="health-warning">{{ formatNumber(limitedAccounts) }}</text>
            </view>
            <view class="health-row">
              <text>总数</text>
              <text>{{ formatNumber(totalAccounts) }}</text>
            </view>
          </view>
        </view>
      </SectionCard>

      <SectionCard title="吞吐趋势" :subtitle="`${rangeLabel} Token / 请求双轴趋势`">
        <view class="chart-panel tall-chart">
          <qiun-data-charts type="mix" canvas-id="monitor-throughput-mix" :chart-data="throughputMixChartData" :opts="mixOpts" background="none" />
        </view>
      </SectionCard>

      <SectionCard title="请求与成本" subtitle="请求量柱状图与花费走势">
        <view class="chart-panel">
          <qiun-data-charts type="column" canvas-id="monitor-request-column" :chart-data="requestColumnChartData" :opts="columnOpts" background="none" />
        </view>
        <view class="chart-panel mt-16">
          <qiun-data-charts type="line" canvas-id="monitor-cost-line" :chart-data="costLineChartData" :opts="lineOpts" background="none" />
        </view>
      </SectionCard>

      <SectionCard title="模型 Top 5" subtitle="按当前时间范围统计模型请求和成本。">
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
        <view v-else class="empty-inline">
          <text>暂无模型统计。</text>
        </view>
      </SectionCard>

      <SectionCard title="近期明细" subtitle="最近 6 个趋势点，辅助判断波峰波谷。">
        <view v-if="latestTrendPoints.length">
          <view v-for="point in latestTrendPoints" :key="point.date" class="list-card compact-card">
            <view class="list-head">
              <view class="flex-1">
                <text class="list-title">{{ point.date }}</text>
                <text class="list-meta">请求 {{ formatNumber(point.requests) }} · Token {{ formatTokenValue(point.total_tokens) }}</text>
              </view>
              <text class="badge">{{ formatMoney(point.cost) }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-inline">
          <text>暂无趋势明细。</text>
        </view>
      </SectionCard>
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
import QiunDataCharts from '@/components/qiun-data-charts/qiun-data-charts.vue';
import { getAdminSettings, getDashboardModels, getDashboardStats, getDashboardTrend, listAccounts } from '@/services/admin';
import { adminConfigState, hasAuthenticatedAdminSession } from '@/store/admin-config';
import type { AdminAccount, DashboardModelStats, DashboardStats, DashboardTrend } from '@/types/admin';
import { formatDisplayTime, formatMoney, formatNumber, formatTokenValue, getDateRange, getErrorMessage, getPointLabel, type RangeKey } from '@/utils/format';

const rangeOptions: Array<{ key: RangeKey; label: string }> = [
  { key: '24h', label: '24H' },
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
];

const rangeKey = ref<RangeKey>('7d');
const loading = ref(false);
const errorMessage = ref('');
const stats = ref<DashboardStats>();
const siteName = ref('管理控制台');
const accounts = ref<AdminAccount[]>([]);
const accountsTotal = ref(0);
const trend = ref<DashboardTrend['trend']>([]);
const models = ref<DashboardModelStats['models']>([]);
const lastLoadedAt = ref('');
const loadedOnce = ref(false);
const loadedConfigKey = ref('');

const hasAccount = computed(() => hasAuthenticatedAdminSession(adminConfigState));
const range = computed(() => getDateRange(rangeKey.value));
const rangeLabel = computed(() => rangeOptions.find((item) => item.key === rangeKey.value)?.label || '7D');
const hasDashboardData = computed(() => Boolean(stats.value || accounts.value.length || trend.value.length || models.value.length));
const initialLoading = computed(() => loading.value && !hasDashboardData.value);

function currentConfigKey() {
  return `${adminConfigState.activeAccountId}:${adminConfigState.baseUrl}`;
}

function hasAccountError(account: AdminAccount) {
  return Boolean(account.status === 'error' || account.error_message);
}

function hasAccountRateLimited(account: AdminAccount) {
  if (account.rate_limit_reset_at) {
    const resetTime = new Date(account.rate_limit_reset_at).getTime();
    if (!Number.isNaN(resetTime) && resetTime > Date.now()) return true;
  }

  const modelLimits = account.extra?.model_rate_limits;
  if (!modelLimits || typeof modelLimits !== 'object' || Array.isArray(modelLimits)) return false;

  const now = Date.now();
  const limits = modelLimits as Record<string, unknown>;
  for (const key in limits) {
    const info = limits[key];
    if (!info || typeof info !== 'object' || Array.isArray(info)) continue;
    const resetAt = (info as { rate_limit_reset_at?: unknown }).rate_limit_reset_at;
    if (typeof resetAt !== 'string' || !resetAt.trim()) continue;
    const resetTime = new Date(resetAt).getTime();
    if (!Number.isNaN(resetTime) && resetTime > now) return true;
  }

  return false;
}

const totalAccounts = computed(() => stats.value?.total_accounts ?? accountsTotal.value ?? accounts.value.length);
const errorAccounts = computed(() => Math.max(stats.value?.error_accounts ?? 0, accounts.value.filter(hasAccountError).length));
const healthyAccounts = computed(() => stats.value?.normal_accounts ?? Math.max(totalAccounts.value - errorAccounts.value, 0));
const limitedAccounts = computed(() => accounts.value.filter(hasAccountRateLimited).length);
const topModels = computed(() => models.value.slice(0, 5));
const latestTrendPoints = computed(() => trend.value.slice(-6).reverse());
const healthScore = computed(() => {
  const total = Math.max(totalAccounts.value, 1);
  const errorPenalty = Math.round((errorAccounts.value / total) * 45);
  const limitedPenalty = Math.round((limitedAccounts.value / total) * 20);
  const noTrafficPenalty = Number(stats.value?.today_requests ?? 0) > 0 ? 0 : 8;
  return Math.max(0, Math.min(100, 100 - errorPenalty - limitedPenalty - noTrafficPenalty));
});
const healthLabel = computed(() => (healthScore.value >= 85 ? '健康' : healthScore.value >= 65 ? '稳定' : healthScore.value >= 45 ? '风险' : '异常'));
const healthRiskText = computed(() => (healthScore.value >= 85 ? '状态良好' : healthScore.value >= 65 ? '轻微风险' : healthScore.value >= 45 ? '风险' : '需处理'));
const healthToneClass = computed(() => (healthScore.value >= 85 ? 'health-ok' : healthScore.value >= 65 ? 'health-warning' : 'health-danger'));
const metricCards = computed(() => [
  {
    key: 'request',
    label: '请求',
    value: formatNumber(stats.value?.today_requests),
    detail: `Token ${formatTokenValue(stats.value?.today_tokens)} · QPS ${formatNumber(stats.value?.rpm)}`,
  },
  {
    key: 'sla',
    label: 'SLA',
    value: `${healthScore.value.toFixed(2)}%`,
    detail: `异常账号 ${formatNumber(errorAccounts.value)}`,
    tone: healthScore.value >= 85 ? 'success' : healthScore.value >= 65 ? 'warning' : 'danger',
  },
  {
    key: 'errors',
    label: '请求错误',
    value: totalAccounts.value ? `${((errorAccounts.value / totalAccounts.value) * 100).toFixed(2)}%` : '0.00%',
    detail: `错误账号 ${formatNumber(errorAccounts.value)} · 总账号 ${formatNumber(totalAccounts.value)}`,
    tone: errorAccounts.value > 0 ? 'danger' : 'success',
  },
  {
    key: 'cost',
    label: '今日成本',
    value: formatMoney(stats.value?.today_cost),
    detail: `总成本 ${formatMoney(stats.value?.total_cost)}`,
  },
]);
const emptyLine = computed(() => [{ label: '暂无', value: 0 }]);
const trendSource = computed(() => (trend.value.length ? trend.value : emptyLine.value.map((item) => ({
  date: item.label,
  requests: item.value,
  total_tokens: item.value,
  cost: item.value,
  input_tokens: 0,
  output_tokens: 0,
  cache_creation_tokens: 0,
  cache_read_tokens: 0,
  actual_cost: 0,
}))));
const chartCategories = computed(() => trendSource.value.map((item) => getPointLabel(item.date, rangeKey.value)));
const sparklineChartData = computed(() => ({
  categories: chartCategories.value,
  series: [
    {
      name: 'QPS',
      data: trendSource.value.map((item) => Number(item.requests ?? 0)),
      color: '#3b82f6',
    },
  ],
}));
const throughputMixChartData = computed(() => ({
  categories: chartCategories.value,
  series: [
    {
      name: '请求',
      type: 'column',
      data: trendSource.value.map((item) => Number(item.requests ?? 0)),
      color: '#3b82f6',
    },
    {
      name: 'Token',
      type: 'line',
      data: trendSource.value.map((item) => Number(item.total_tokens ?? 0)),
      color: '#10b981',
      index: 1,
    },
  ],
}));
const requestColumnChartData = computed(() => ({
  categories: chartCategories.value,
  series: [
    {
      name: '请求量',
      data: trendSource.value.map((item) => Number(item.requests ?? 0)),
      color: '#2563eb',
    },
  ],
}));
const costLineChartData = computed(() => ({
  categories: chartCategories.value,
  series: [
    {
      name: '成本',
      data: trendSource.value.map((item) => Number(item.cost ?? 0)),
      color: '#f97316',
    },
  ],
}));
const healthArcChartData = computed(() => ({
  series: [
    {
      name: healthLabel.value,
      data: healthScore.value / 100,
      color: healthScore.value >= 85 ? '#10b981' : healthScore.value >= 65 ? '#f59e0b' : '#ef4444',
    },
  ],
}));
const accountRingChartData = computed(() => ({
  series: [
    {
      data: [
        { name: '健康', value: healthyAccounts.value, color: '#10b981' },
        { name: '异常', value: errorAccounts.value, color: '#ef4444' },
        { name: '限流', value: limitedAccounts.value, color: '#f59e0b' },
      ],
    },
  ],
}));
const commonChartOpts = {
  color: ['#3b82f6', '#10b981', '#f97316', '#ef4444', '#8b5cf6'],
  padding: [10, 10, 0, 4],
  dataLabel: false,
  dataPointShape: false,
  legend: { show: true, position: 'top', float: 'right' },
  xAxis: {
    disableGrid: true,
    fontColor: '#94a3b8',
    axisLine: false,
  },
  yAxis: {
    gridType: 'dash',
    dashLength: 4,
    data: [{ fontColor: '#94a3b8' }],
  },
  extra: {
    tooltip: { showBox: true },
  },
};
const sparklineOpts = {
  ...commonChartOpts,
  padding: [6, 0, 0, 0],
  legend: { show: false },
  xAxis: { ...commonChartOpts.xAxis, disabled: true },
  yAxis: { disabled: true },
  extra: {
    area: {
      type: 'curve',
      opacity: 0.18,
      addLine: true,
      width: 2,
    },
  },
};
const mixOpts = {
  ...commonChartOpts,
  extra: {
    mix: {
      column: {
        width: 14,
        activeBgOpacity: 0.08,
      },
      line: {
        type: 'curve',
        width: 3,
      },
    },
  },
  yAxis: {
    ...commonChartOpts.yAxis,
    data: [
      { title: '请求', fontColor: '#94a3b8' },
      { title: 'Token', position: 'right', fontColor: '#10b981' },
    ],
  },
};
const columnOpts = {
  ...commonChartOpts,
  legend: { show: false },
  extra: {
    column: {
      type: 'group',
      width: 18,
      activeBgOpacity: 0.08,
      linearType: 'custom',
      seriesGap: 4,
      linearOpacity: 0.85,
    },
  },
};
const lineOpts = {
  ...commonChartOpts,
  legend: { show: false },
  extra: {
    line: {
      type: 'curve',
      width: 3,
      activeType: 'hollow',
    },
  },
};
const healthArcOpts = computed(() => ({
  color: [healthScore.value >= 85 ? '#10b981' : healthScore.value >= 65 ? '#f59e0b' : '#ef4444'],
  padding: [0, 0, 0, 0],
  title: { name: '', fontSize: 1 },
  subtitle: { name: '', fontSize: 1 },
  extra: {
    arcbar: {
      type: 'circle',
      width: 10,
      backgroundColor: '#e8eef7',
      startAngle: 0.75,
      endAngle: 0.25,
      gap: 2,
    },
  },
}));
const ringOpts = computed(() => ({
  color: ['#10b981', '#ef4444', '#f59e0b'],
  padding: [0, 0, 0, 0],
  legend: { show: false },
  title: {
    name: formatNumber(totalAccounts.value),
    fontSize: 22,
    color: '#0f172a',
  },
  subtitle: {
    name: '账号',
    fontSize: 12,
    color: '#64748b',
  },
  extra: {
    ring: {
      ringWidth: 20,
      activeOpacity: 0.5,
      offsetAngle: -90,
      labelWidth: 12,
      border: false,
    },
  },
}));

async function loadData(force = false, stopRefresh = false) {
  if (!hasAccount.value) {
    if (stopRefresh) uni.stopPullDownRefresh();
    return;
  }
  if (loading.value) {
    if (stopRefresh) uni.stopPullDownRefresh();
    return;
  }
  if (!force && loadedOnce.value && loadedConfigKey.value === currentConfigKey()) return;

  loading.value = true;
  if (!hasDashboardData.value) errorMessage.value = '';
  const currentRange = range.value;

  try {
    const [settingsData, statsData, accountsData, trendData, modelsData] = await Promise.all([
      getAdminSettings(),
      getDashboardStats(),
      listAccounts(''),
      getDashboardTrend(currentRange),
      getDashboardModels({ start_date: currentRange.start_date, end_date: currentRange.end_date }),
    ]);

    siteName.value = settingsData.site_name?.trim() || '管理控制台';
    stats.value = statsData;
    accounts.value = accountsData.items || [];
    accountsTotal.value = accountsData.total || accounts.value.length;
    trend.value = trendData.trend || [];
    models.value = modelsData.models || [];
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

function setRange(next: RangeKey) {
  if (rangeKey.value === next) return;
  rangeKey.value = next;
  void loadData(true);
}

function goAccounts() {
  uni.switchTab({ url: '/pages/accounts/index' });
}

function goMetricDetail(type: string) {
  uni.navigateTo({ url: `/pages/monitor/metric-detail?type=${type}&range=${rangeKey.value}` });
}

function refreshData() {
  void loadData(true);
}

onShow(() => {
  if (!hasAccount.value) {
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
.range-pills {
  display: flex;
  flex-direction: row;
  gap: 10rpx;
}

.ops-overview {
  display: grid;
  grid-template-columns: 220rpx 1fr;
  gap: 24rpx;
  min-height: 270rpx;
}

.health-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 14rpx 0;
}

.health-ring {
  position: relative;
  width: 168rpx;
  height: 168rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.health-core {
  position: absolute;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.health-score {
  color: #f59e0b;
  font-size: 44rpx;
  line-height: 1;
  font-weight: 950;
}

.health-label,
.health-title {
  margin-top: 8rpx;
  color: #64748b;
  font-size: 21rpx;
  font-weight: 800;
}

.health-risk {
  margin-top: 6rpx;
  font-size: 22rpx;
  font-weight: 900;
}

.realtime-block {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.live-dot-row,
.metric-topline {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10rpx;
  color: #64748b;
  font-size: 22rpx;
  font-weight: 800;
}

.live-dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: #3b82f6;
  box-shadow: 0 0 0 8rpx rgba(59, 130, 246, 0.12);
}

.info-muted {
  margin-left: auto;
  color: #94a3b8;
}

.live-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
  margin-top: 22rpx;
}

.live-number {
  display: inline;
  color: #0f172a;
  font-size: 40rpx;
  font-weight: 950;
}

.live-label {
  margin-left: 8rpx;
  color: #64748b;
  font-size: 22rpx;
  font-weight: 900;
}

.sparkline-wrap {
  height: 118rpx;
  margin-top: 14rpx;
}

.ops-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
  margin-bottom: 22rpx;
}

.ops-metric-card {
  min-height: 168rpx;
  padding: 24rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 8rpx 48rpx rgba(15, 23, 42, 0.05);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.ops-metric-clickable {
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.ops-metric-clickable:active {
  transform: translateY(-2rpx);
  border-color: rgba(147, 197, 253, 0.6);
}

.metric-link {
  margin-left: auto;
  color: #3b82f6;
  font-size: 20rpx;
}

.metric-card-label {
  color: #94a3b8;
}

.metric-card-value {
  display: block;
  margin-top: 14rpx;
  color: #0f172a;
  font-size: 42rpx;
  line-height: 1.05;
  font-weight: 950;
}

.metric-card-detail {
  display: block;
  margin-top: 12rpx;
  color: #94a3b8;
  font-size: 21rpx;
  line-height: 1.35;
}

.ops-metric-danger .metric-card-value {
  color: #ef4444;
}

.ops-metric-warning .metric-card-value {
  color: #f59e0b;
}

.ops-metric-success .metric-card-value {
  color: #10b981;
}

.account-health-grid {
  display: grid;
  grid-template-columns: 260rpx 1fr;
  gap: 20rpx;
  align-items: center;
}

.account-health-main {
  height: 250rpx;
}

.account-health-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.health-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  min-height: 54rpx;
  padding: 0 18rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.45);
  color: #64748b;
  font-size: 23rpx;
  font-weight: 850;
}

.health-ok {
  color: #10b981;
}

.health-danger {
  color: #ef4444;
}

.health-warning {
  color: #f59e0b;
}

.chart-panel {
  height: 360rpx;
  min-width: 0;
}

.tall-chart {
  height: 430rpx;
}

.compact-card {
  margin-bottom: 12rpx;
  box-shadow: none;
}

@media screen and (max-width: 360px) {
  .ops-overview,
  .account-health-grid {
    grid-template-columns: 1fr;
  }

  .health-block {
    min-height: 230rpx;
  }
}
</style>
