<template>
  <PageShell>
    <HeroHeader title="服务器" subtitle="管理多个 Sub2API 管理端连接，添加后会立即验证并切换。" eyebrow="Connection">
      <template #right>
        <button class="btn btn-primary btn-small" @tap="toggleForm">{{ showForm ? '收起' : '添加' }}</button>
      </template>
    </HeroHeader>

    <SectionCard v-if="showForm" title="添加服务器" subtitle="保存前会调用管理接口确认连接可用。">
      <text class="input-label">服务器地址</text>
      <input v-model="baseUrl" class="input" placeholder="例如：https://api.example.com" />

      <text class="input-label">Admin Key</text>
      <view class="key-row">
        <input v-model="adminApiKey" class="input key-input" :password="!showAdminKey" placeholder="admin-xxxxxxxx" />
        <button class="btn btn-ghost btn-small" @tap="showAdminKey = !showAdminKey">{{ showAdminKey ? '隐藏' : '显示' }}</button>
      </view>

      <NoticeBlock v-if="message" :type="connectionState === 'success' ? 'success' : 'error'" :text="message" class="mt-16" />

      <view class="btn-row mt-16">
        <button class="btn btn-primary flex-1" :disabled="checking" :class="checking ? 'btn-disabled' : ''" @tap="handleAdd">
          {{ checking ? '检测中...' : '保存并使用' }}
        </button>
        <button class="btn btn-ghost flex-1" @tap="resetForm">取消</button>
      </view>
    </SectionCard>

    <SectionCard title="服务器列表" :subtitle="adminConfigState.accounts.length ? '点击卡片可切换当前管理对象。' : '还没有服务器，先添加一个连接。'">
      <view v-if="adminConfigState.accounts.length">
        <view v-for="account in adminConfigState.accounts" :key="account.id" class="list-card server-card" :class="account.id === adminConfigState.activeAccountId ? 'server-card-active' : ''">
          <view class="list-head">
            <view class="flex-1">
              <text class="list-title">{{ account.label }}</text>
              <text class="list-meta">{{ account.baseUrl }}</text>
              <text class="list-meta">更新时间 {{ formatDisplayTime(account.updatedAt) }}</text>
            </view>
            <text v-if="account.id === adminConfigState.activeAccountId" class="badge badge-success">当前</text>
          </view>
          <view class="btn-row mt-16">
            <button class="btn btn-primary flex-1" @tap="handleSelect(account.id)">{{ account.id === adminConfigState.activeAccountId ? '已选中' : '切换' }}</button>
            <button class="btn btn-danger" @tap="handleDelete(account.id)">删除</button>
          </view>
        </view>
      </view>
      <NoticeBlock v-else text="点击右上角添加服务器，连接成功后会自动进入概览。" />
    </SectionCard>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import PageShell from '@/components/uni/PageShell.vue';
import HeroHeader from '@/components/uni/HeroHeader.vue';
import SectionCard from '@/components/uni/SectionCard.vue';
import NoticeBlock from '@/components/uni/NoticeBlock.vue';
import { getAdminSettings, getDashboardStats } from '@/services/admin';
import { adminConfigState, removeAdminAccount, saveAdminConfig, switchAdminAccount } from '@/store/admin-config';
import { formatDisplayTime, getErrorMessage } from '@/utils/format';

const showForm = ref(adminConfigState.accounts.length === 0);
const baseUrl = ref('');
const adminApiKey = ref('');
const showAdminKey = ref(false);
const message = ref('');
const connectionState = ref<'idle' | 'checking' | 'success' | 'error'>('idle');
const checking = computed(() => connectionState.value === 'checking');

function toggleForm() {
  showForm.value = !showForm.value;
  message.value = '';
  connectionState.value = 'idle';
}

function resetForm() {
  baseUrl.value = '';
  adminApiKey.value = '';
  showForm.value = false;
  message.value = '';
  connectionState.value = 'idle';
}

async function verifyAndEnter(successMessage: string) {
  connectionState.value = 'checking';
  message.value = '正在检测当前服务是否可用...';

  try {
    await getAdminSettings();
    await getDashboardStats();
    connectionState.value = 'success';
    message.value = successMessage;
    uni.reLaunch({ url: '/pages/monitor/index' });
  } catch (error) {
    connectionState.value = 'error';
    message.value = getErrorMessage(error, '连接失败，请检查服务器地址、Admin Key 和网络连通性。');
  }
}

async function handleAdd() {
  if (!baseUrl.value.trim()) {
    connectionState.value = 'error';
    message.value = '请先填写服务器地址。';
    return;
  }

  if (!adminApiKey.value.trim()) {
    connectionState.value = 'error';
    message.value = '请先填写 Admin Key。';
    return;
  }

  await saveAdminConfig({ baseUrl: baseUrl.value, adminApiKey: adminApiKey.value });
  resetForm();
  showForm.value = false;
  await verifyAndEnter('服务器已添加并切换成功。');
}

async function handleSelect(accountId: string) {
  await switchAdminAccount(accountId);
  await verifyAndEnter('服务器已切换。');
}

async function handleDelete(accountId: string) {
  uni.showModal({
    title: '删除服务器',
    content: '确认删除这个服务器配置吗？',
    success: async (result) => {
      if (result.confirm) {
        await removeAdminAccount(accountId);
      }
    },
  });
}
</script>

<style scoped>
.key-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 14rpx;
}

.key-input {
  flex: 1;
}

.server-card-active {
  border-color: rgba(37, 99, 235, 0.55);
  background: rgba(239, 246, 255, 0.95);
}
</style>
