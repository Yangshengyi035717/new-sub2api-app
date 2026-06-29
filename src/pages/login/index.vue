<template>
  <PageShell>
    <view class="login-wrap">
      <view class="login-brand">
        <text class="eyebrow">SUB2API OPS</text>
        <text class="login-title">重新设计的移动管理台</text>
        <text class="login-subtitle">输入服务地址和 Admin Key，连接成功后进入概览、用户、账号与服务器管理。</text>
      </view>

      <SectionCard title="管理员入口" subtitle="H5 端会把连接信息保存在浏览器本地，请只在可信设备上使用。">
        <text class="input-label">服务器地址</text>
        <input v-model="baseUrl" class="input" placeholder="例如：https://api.example.com" />

        <text class="input-label">Admin Key</text>
        <view class="key-row">
          <input v-model="adminApiKey" class="input key-input" :password="!showAdminKey" placeholder="admin-xxxxxxxx" />
          <button class="btn btn-ghost btn-small" @tap="showAdminKey = !showAdminKey">{{ showAdminKey ? '隐藏' : '显示' }}</button>
        </view>

        <NoticeBlock v-if="message" :type="connectionState === 'success' ? 'success' : 'error'" :text="message" class="mt-16" />

        <button class="btn btn-primary mt-16" :class="checking ? 'btn-disabled' : ''" :disabled="checking" @tap="handleLogin">
          {{ checking ? '连接中...' : '进入应用' }}
        </button>
      </SectionCard>
    </view>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import PageShell from '@/components/uni/PageShell.vue';
import SectionCard from '@/components/uni/SectionCard.vue';
import NoticeBlock from '@/components/uni/NoticeBlock.vue';
import { getAdminSettings, getDashboardStats } from '@/services/admin';
import { adminConfigState, hasAuthenticatedAdminSession, saveAdminConfig } from '@/store/admin-config';
import { getErrorMessage } from '@/utils/format';

const baseUrl = ref(adminConfigState.baseUrl);
const adminApiKey = ref(adminConfigState.adminApiKey);
const showAdminKey = ref(false);
const message = ref('');
const connectionState = ref<'idle' | 'checking' | 'success' | 'error'>('idle');
const checking = computed(() => connectionState.value === 'checking');

if (hasAuthenticatedAdminSession(adminConfigState)) {
  uni.reLaunch({ url: '/pages/monitor/index' });
}

async function handleLogin() {
  message.value = '';

  if (!baseUrl.value.trim()) {
    message.value = '请先填写服务器地址。';
    connectionState.value = 'error';
    return;
  }

  if (!adminApiKey.value.trim()) {
    message.value = '请先填写 Admin Key。';
    connectionState.value = 'error';
    return;
  }

  connectionState.value = 'checking';
  message.value = '正在验证服务器连接...';

  try {
    await saveAdminConfig({ baseUrl: baseUrl.value, adminApiKey: adminApiKey.value });
    await getAdminSettings();
    await getDashboardStats();
    connectionState.value = 'success';
    message.value = '连接成功，正在进入概览。';
    uni.reLaunch({ url: '/pages/monitor/index' });
  } catch (error) {
    connectionState.value = 'error';
    message.value = getErrorMessage(error, '连接失败，请检查服务器地址、Admin Key 和网络连通性。');
  }
}
</script>

<style scoped>
.login-wrap {
  min-height: calc(100vh - 180rpx);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.login-brand {
  margin-bottom: 28rpx;
  padding: 10rpx 4rpx;
}

.login-title {
  display: block;
  max-width: 620rpx;
  font-size: 58rpx;
  line-height: 1.08;
  font-weight: 950;
  color: #0f172a;
}

.login-subtitle {
  display: block;
  margin-top: 18rpx;
  max-width: 640rpx;
  color: #64748b;
  font-size: 27rpx;
  line-height: 1.55;
}

.key-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 14rpx;
}

.key-input {
  flex: 1;
}
</style>
