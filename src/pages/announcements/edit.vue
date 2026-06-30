<template>
  <PageShell>
    <HeroHeader :title="isEditing ? '编辑公告' : '创建公告'" subtitle="字段与 PC 端公告弹窗保持一致，支持 Markdown、状态、通知方式、时间窗口和展示条件。" eyebrow="Announcement" />

    <NoticeBlock v-if="loading" text="正在加载公告..." />
    <NoticeBlock v-else-if="loadError" type="error" :text="loadError" />

    <template v-else>
      <SectionCard title="基础信息">
        <text class="input-label">标题</text>
        <input v-model="title" class="input" placeholder="例如：gpt5.5 特惠分组说明" />

        <text class="input-label">内容（支持 Markdown）</text>
        <textarea v-model="content" class="textarea content-textarea" placeholder="请输入公告内容，支持 Markdown 语法。" />
      </SectionCard>

      <SectionCard title="发布配置">
        <text class="input-label">状态</text>
        <view class="chip-row">
          <text v-for="item in statusOptions" :key="item.value" class="chip" :class="status === item.value ? 'chip-active' : ''" @tap="status = item.value">{{ item.label }}</text>
        </view>

        <text class="input-label">通知方式</text>
        <view class="chip-row">
          <text v-for="item in notifyModeOptions" :key="item.value" class="chip" :class="notifyMode === item.value ? 'chip-active' : ''" @tap="notifyMode = item.value">{{ item.label }}</text>
        </view>
        <text class="form-hint">弹窗模式会自动弹出通知给用户；静默模式只在用户侧公告入口展示。</text>
      </SectionCard>

      <SectionCard title="展示时间" subtitle="开始为空表示立即生效，结束为空表示永久生效。">
        <view class="time-editor">
          <view class="time-head">
            <text class="time-title">开始时间</text>
            <button class="btn btn-ghost btn-small" @tap="clearStartTime">清空</button>
          </view>
          <view class="date-time-grid">
            <picker mode="date" :value="startsDate" @change="handleStartDateChange">
              <view class="filter-select">{{ startsDate || '年 / 月 / 日' }}</view>
            </picker>
            <picker mode="time" :value="startsTime" @change="handleStartTimeChange">
              <view class="filter-select">{{ startsTime || '--:--' }}</view>
            </picker>
          </view>
        </view>

        <view class="time-editor mt-16">
          <view class="time-head">
            <text class="time-title">结束时间</text>
            <button class="btn btn-ghost btn-small" @tap="clearEndTime">清空</button>
          </view>
          <view class="date-time-grid">
            <picker mode="date" :value="endsDate" @change="handleEndDateChange">
              <view class="filter-select">{{ endsDate || '年 / 月 / 日' }}</view>
            </picker>
            <picker mode="time" :value="endsTime" @change="handleEndTimeChange">
              <view class="filter-select">{{ endsTime || '--:--' }}</view>
            </picker>
          </view>
        </view>
      </SectionCard>

      <SectionCard title="展示条件" subtitle="所有用户为默认规则；自定义条件遵循 PC 端 any_of / all_of 规则。">
        <view class="target-mode-row">
          <text class="chip" :class="targetingMode === 'all' ? 'chip-active' : ''" @tap="setTargetingMode('all')">所有用户</text>
          <text class="chip" :class="targetingMode === 'custom' ? 'chip-active' : ''" @tap="setTargetingMode('custom')">按条件</text>
        </view>

        <view v-if="targetingMode === 'custom'" class="target-editor">
          <NoticeBlock text="任意条件组命中即可展示；同一条件组内的条件需要同时满足。" />

          <view v-for="(group, groupIndex) in targetGroups" :key="groupIndex" class="target-group">
            <view class="target-group-head">
              <view>
                <text class="target-group-title">条件组 #{{ groupIndex + 1 }}</text>
                <text class="list-meta">组内条件为 AND，多个条件组为 OR。</text>
              </view>
              <button class="btn btn-danger btn-small" @tap="removeTargetGroup(groupIndex)">删除组</button>
            </view>

            <view v-for="(condition, conditionIndex) in group.all_of" :key="conditionIndex" class="condition-card">
              <view class="condition-head">
                <text class="condition-title">{{ condition.type === 'subscription' ? '订阅套餐' : '余额条件' }}</text>
                <button class="btn btn-ghost btn-small" @tap="removeCondition(groupIndex, conditionIndex)">删除</button>
              </view>

              <view v-if="condition.type === 'subscription'">
                <text class="form-hint">选择一个或多个订阅套餐，用户拥有其中任一套餐即满足该条件。</text>
                <view v-if="subscriptionGroups.length" class="chip-row mt-16">
                  <text
                    v-for="groupItem in subscriptionGroups"
                    :key="groupItem.id"
                    class="chip condition-chip"
                    :class="condition.group_ids?.includes(groupItem.id) ? 'chip-active' : ''"
                    @tap="toggleGroupId(condition, groupItem.id)"
                  >
                    {{ groupItem.name }}
                  </text>
                </view>
                <NoticeBlock v-else class="mt-16" text="没有读取到订阅套餐分组；请先在 PC 或分组页确认 subscription 类型分组。" />
              </view>

              <view v-else>
                <text class="form-hint">按用户余额比较展示。</text>
                <view class="balance-row mt-16">
                  <picker mode="selector" :range="balanceOperatorOptions" range-key="label" :value="selectedOperatorIndex(condition.operator)" @change="(event) => handleOperatorChange(condition, event)">
                    <view class="filter-select">{{ operatorLabel(condition.operator) }}</view>
                  </picker>
                  <input :value="String(condition.value ?? 0)" class="input balance-input" type="digit" placeholder="金额" @input="(event) => handleBalanceValueInput(condition, event)" />
                </view>
              </view>
            </view>

            <view class="btn-row mt-16">
              <button class="btn btn-ghost btn-small" @tap="addSubscriptionCondition(groupIndex)">添加订阅条件</button>
              <button class="btn btn-ghost btn-small" @tap="addBalanceCondition(groupIndex)">添加余额条件</button>
            </view>
          </view>

          <button class="btn btn-ghost add-group-btn" @tap="addTargetGroup">添加条件组</button>
        </view>
      </SectionCard>

      <NoticeBlock v-if="formError" type="error" :text="formError" class="mb-16" />
      <button class="btn btn-dark" :disabled="!canSubmit || submitting" :class="!canSubmit || submitting ? 'btn-disabled' : ''" @tap="submit">
        {{ submitting ? '保存中...' : '保存公告' }}
      </button>
    </template>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import PageShell from '@/components/uni/PageShell.vue';
import HeroHeader from '@/components/uni/HeroHeader.vue';
import SectionCard from '@/components/uni/SectionCard.vue';
import NoticeBlock from '@/components/uni/NoticeBlock.vue';
import { createAnnouncement, getAnnouncement, listGroups, updateAnnouncement } from '@/services/admin';
import type {
  AdminAnnouncement,
  AdminGroup,
  AnnouncementCondition,
  AnnouncementConditionGroup,
  AnnouncementNotifyMode,
  AnnouncementOperator,
  AnnouncementStatus,
  AnnouncementTargeting,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
} from '@/types/admin';
import { getErrorMessage } from '@/utils/format';

type TargetingMode = 'all' | 'custom';

const statusOptions: Array<{ label: string; value: AnnouncementStatus }> = [
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'active' },
  { label: '已归档', value: 'archived' },
];

const notifyModeOptions: Array<{ label: string; value: AnnouncementNotifyMode }> = [
  { label: '静默', value: 'silent' },
  { label: '弹窗', value: 'popup' },
];

const balanceOperatorOptions: Array<{ label: string; value: Exclude<AnnouncementOperator, 'in'> }> = [
  { label: '大于', value: 'gt' },
  { label: '大于等于', value: 'gte' },
  { label: '小于', value: 'lt' },
  { label: '小于等于', value: 'lte' },
  { label: '等于', value: 'eq' },
];

const announcementId = ref(0);
const originalAnnouncement = ref<AdminAnnouncement>();
const title = ref('');
const content = ref('');
const status = ref<AnnouncementStatus>('draft');
const notifyMode = ref<AnnouncementNotifyMode>('silent');
const startsDate = ref('');
const startsTime = ref('');
const endsDate = ref('');
const endsTime = ref('');
const targetingMode = ref<TargetingMode>('all');
const targetGroups = ref<AnnouncementConditionGroup[]>([]);
const subscriptionGroups = ref<AdminGroup[]>([]);
const loading = ref(false);
const submitting = ref(false);
const loadError = ref('');
const formError = ref('');

const isEditing = computed(() => announcementId.value > 0);
const canSubmit = computed(() => Boolean(title.value.trim() && content.value.trim()));

function pad(value: number) {
  return `${value}`.padStart(2, '0');
}

function localParts(value?: string | null) {
  if (!value) return { date: '', time: '' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '', time: '' };
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

function timestampFromParts(dateValue: string, timeValue: string) {
  if (!dateValue) return undefined;
  const date = new Date(`${dateValue}T${timeValue || '00:00'}:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  return Math.floor(date.getTime() / 1000);
}

function selectedOperatorIndex(value?: string) {
  return Math.max(balanceOperatorOptions.findIndex((item) => item.value === value), 0);
}

function operatorLabel(value?: string) {
  return balanceOperatorOptions.find((item) => item.value === value)?.label || '大于等于';
}

function setTargetingMode(nextMode: TargetingMode) {
  targetingMode.value = nextMode;
  if (nextMode === 'custom' && targetGroups.value.length === 0) {
    targetGroups.value = [{ all_of: [defaultSubscriptionCondition()] }];
  }
}

function defaultSubscriptionCondition(): AnnouncementCondition {
  return {
    type: 'subscription',
    operator: 'in',
    group_ids: [],
  };
}

function defaultBalanceCondition(): AnnouncementCondition {
  return {
    type: 'balance',
    operator: 'gte',
    value: 0,
  };
}

function normalizeTargeting(targeting?: AnnouncementTargeting) {
  const groups = targeting?.any_of || [];
  if (!groups.length) {
    targetingMode.value = 'all';
    targetGroups.value = [];
    return;
  }

  targetingMode.value = 'custom';
  targetGroups.value = groups.map((group) => ({
    all_of: (group.all_of || []).map((condition) => {
      if (condition.type === 'subscription') {
        return {
          type: 'subscription',
          operator: 'in',
          group_ids: [...(condition.group_ids || [])],
        };
      }
      return {
        type: 'balance',
        operator: ['gt', 'gte', 'lt', 'lte', 'eq'].includes(condition.operator) ? condition.operator : 'gte',
        value: Number(condition.value ?? 0),
      };
    }),
  }));
}

function buildTargeting(): AnnouncementTargeting {
  if (targetingMode.value === 'all') return { any_of: [] };

  return {
    any_of: targetGroups.value.map((group) => ({
      all_of: (group.all_of || []).map((condition) => {
        if (condition.type === 'subscription') {
          return {
            type: 'subscription',
            operator: 'in',
            group_ids: [...(condition.group_ids || [])],
          };
        }
        return {
          type: 'balance',
          operator: condition.operator,
          value: Number(condition.value ?? 0),
        };
      }),
    })),
  };
}

function validateTargeting() {
  if (targetingMode.value === 'all') return '';
  if (targetGroups.value.length === 0) return '请至少添加一个条件组，或切换为所有用户。';

  for (const group of targetGroups.value) {
    if (!group.all_of?.length) return '每个条件组至少需要一个条件。';
    for (const condition of group.all_of) {
      if (condition.type === 'subscription' && !condition.group_ids?.length) {
        return '订阅套餐条件至少需要选择一个套餐。';
      }
      if (condition.type === 'balance' && !Number.isFinite(Number(condition.value))) {
        return '余额条件金额格式不正确。';
      }
    }
  }

  return '';
}

function addTargetGroup() {
  if (targetGroups.value.length >= 50) return;
  targetGroups.value.push({ all_of: [defaultSubscriptionCondition()] });
}

function removeTargetGroup(groupIndex: number) {
  targetGroups.value.splice(groupIndex, 1);
}

function addSubscriptionCondition(groupIndex: number) {
  const group = targetGroups.value[groupIndex];
  if (!group) return;
  if (!group.all_of) group.all_of = [];
  if (group.all_of.length >= 50) return;
  group.all_of.push(defaultSubscriptionCondition());
}

function addBalanceCondition(groupIndex: number) {
  const group = targetGroups.value[groupIndex];
  if (!group) return;
  if (!group.all_of) group.all_of = [];
  if (group.all_of.length >= 50) return;
  group.all_of.push(defaultBalanceCondition());
}

function removeCondition(groupIndex: number, conditionIndex: number) {
  targetGroups.value[groupIndex]?.all_of?.splice(conditionIndex, 1);
}

function toggleGroupId(condition: AnnouncementCondition, groupId: number) {
  const currentIds = condition.group_ids || [];
  condition.group_ids = currentIds.includes(groupId) ? currentIds.filter((item) => item !== groupId) : [...currentIds, groupId];
}

function handleOperatorChange(condition: AnnouncementCondition, event: { detail: { value: number | string } }) {
  const index = Number(event.detail.value);
  condition.operator = balanceOperatorOptions[Number.isFinite(index) ? index : 0]?.value || 'gte';
}

function handleBalanceValueInput(condition: AnnouncementCondition, event: { detail: { value: string } }) {
  const value = Number(event.detail.value);
  condition.value = Number.isFinite(value) ? value : 0;
}

function handleStartDateChange(event: { detail: { value: string } }) {
  startsDate.value = event.detail.value;
  if (!startsTime.value) startsTime.value = '00:00';
}

function handleStartTimeChange(event: { detail: { value: string } }) {
  startsTime.value = event.detail.value;
  if (!startsDate.value) startsDate.value = todayDate();
}

function handleEndDateChange(event: { detail: { value: string } }) {
  endsDate.value = event.detail.value;
  if (!endsTime.value) endsTime.value = '23:59';
}

function handleEndTimeChange(event: { detail: { value: string } }) {
  endsTime.value = event.detail.value;
  if (!endsDate.value) endsDate.value = todayDate();
}

function todayDate() {
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function clearStartTime() {
  startsDate.value = '';
  startsTime.value = '';
}

function clearEndTime() {
  endsDate.value = '';
  endsTime.value = '';
}

function fillForm(announcement: AdminAnnouncement) {
  title.value = announcement.title || '';
  content.value = announcement.content || '';
  status.value = (announcement.status === 'active' || announcement.status === 'archived' ? announcement.status : 'draft') as AnnouncementStatus;
  notifyMode.value = announcement.notify_mode === 'popup' ? 'popup' : 'silent';
  const start = localParts(announcement.starts_at);
  startsDate.value = start.date;
  startsTime.value = start.time;
  const end = localParts(announcement.ends_at);
  endsDate.value = end.date;
  endsTime.value = end.time;
  normalizeTargeting(announcement.targeting);
}

async function loadSubscriptionGroups() {
  try {
    const data = await listGroups('', 1, 100);
    subscriptionGroups.value = (data.items || []).filter((group) => group.subscription_type === 'subscription');
  } catch {
    subscriptionGroups.value = [];
  }
}

async function loadAnnouncement() {
  if (!announcementId.value) return;

  loading.value = true;
  loadError.value = '';

  try {
    const item = await getAnnouncement(announcementId.value);
    originalAnnouncement.value = item;
    fillForm(item);
  } catch (error) {
    loadError.value = getErrorMessage(error, '加载公告失败。');
  } finally {
    loading.value = false;
  }
}

function buildCreatePayload(): CreateAnnouncementRequest {
  const startsAt = timestampFromParts(startsDate.value, startsTime.value);
  const endsAt = timestampFromParts(endsDate.value, endsTime.value);
  return {
    title: title.value.trim(),
    content: content.value.trim(),
    status: status.value,
    notify_mode: notifyMode.value,
    targeting: buildTargeting(),
    starts_at: startsAt,
    ends_at: endsAt,
  };
}

function buildUpdatePayload(): UpdateAnnouncementRequest {
  return {
    ...buildCreatePayload(),
    starts_at: timestampFromParts(startsDate.value, startsTime.value) ?? 0,
    ends_at: timestampFromParts(endsDate.value, endsTime.value) ?? 0,
  };
}

async function submit() {
  formError.value = '';

  if (!title.value.trim()) {
    formError.value = '请填写公告标题。';
    return;
  }
  if (!content.value.trim()) {
    formError.value = '请填写公告内容。';
    return;
  }

  const startsAt = timestampFromParts(startsDate.value, startsTime.value);
  const endsAt = timestampFromParts(endsDate.value, endsTime.value);
  if (startsAt && endsAt && startsAt >= endsAt) {
    formError.value = '开始时间必须早于结束时间。';
    return;
  }

  const targetingError = validateTargeting();
  if (targetingError) {
    formError.value = targetingError;
    return;
  }

  submitting.value = true;

  try {
    if (isEditing.value) {
      await updateAnnouncement(announcementId.value, buildUpdatePayload());
    } else {
      await createAnnouncement(buildCreatePayload());
    }
    uni.showToast({ title: '保存成功', icon: 'success' });
    uni.redirectTo({ url: '/pages/announcements/index' });
  } catch (error) {
    formError.value = getErrorMessage(error, '保存公告失败，请稍后重试。');
  } finally {
    submitting.value = false;
  }
}

onLoad((query) => {
  announcementId.value = Number(query?.id || 0);
  void loadSubscriptionGroups();
  void loadAnnouncement();
});
</script>

<style scoped>
.content-textarea {
  min-height: 300rpx;
}

.form-hint {
  display: block;
  margin-top: 12rpx;
  color: #536274;
  font-size: 22rpx;
  line-height: 1.4;
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

.time-editor {
  padding: 18rpx;
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.46);
  border: 2rpx solid rgba(255, 255, 255, 0.78);
}

.time-head,
.target-group-head,
.condition-head {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.time-title,
.target-group-title,
.condition-title {
  color: #07111f;
  font-size: 26rpx;
  font-weight: 900;
}

.date-time-grid,
.balance-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180rpx;
  gap: 12rpx;
  margin-top: 14rpx;
}

.target-mode-row {
  display: flex;
  flex-direction: row;
  gap: 16rpx;
}

.target-editor {
  margin-top: 18rpx;
}

.target-group {
  margin-top: 18rpx;
  padding: 20rpx;
  border-radius: 28rpx;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.72), rgba(226, 246, 255, 0.5));
  border: 2rpx solid rgba(255, 255, 255, 0.82);
}

.condition-card {
  margin-top: 16rpx;
  padding: 18rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.66);
  border: 2rpx solid rgba(0, 142, 232, 0.12);
}

.condition-chip {
  max-width: 100%;
}

.balance-input {
  min-height: 72rpx;
}

.add-group-btn {
  width: 100%;
  margin-top: 18rpx;
}
</style>
