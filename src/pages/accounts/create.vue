<template>
  <PageShell>
    <HeroHeader title="添加账号" subtitle="创建 /api/v1/admin/accounts，支持 API Key、OAuth、setup-token 和 upstream。" eyebrow="Create Account" />

    <SectionCard title="基础配置">
      <text class="input-label">账号名称</text>
      <input v-model="name" class="input" placeholder="例如：openai-main" />

      <text class="input-label">平台</text>
      <view class="chip-row">
        <text v-for="item in platformOptions" :key="item" class="chip" :class="platform === item ? 'chip-active' : ''" @tap="platform = item">{{ item }}</text>
      </view>

      <text class="input-label">账号类型</text>
      <view class="chip-row">
        <text v-for="item in accountTypeOptions" :key="item" class="chip" :class="accountType === item ? 'chip-active' : ''" @tap="accountType = item">{{ item }}</text>
      </view>

      <text class="input-label">备注（可选）</text>
      <input v-model="notes" class="input" placeholder="例如：主线路账号" />
    </SectionCard>

    <SectionCard title="凭证信息">
      <view v-if="accountType === 'apikey'">
        <text class="input-label">Base URL</text>
        <input v-model="baseUrl" class="input" placeholder="https://api.example.com" />
        <text class="input-label">API Key</text>
        <input v-model="apiKey" class="input" placeholder="sk-..." />
      </view>
      <view v-else>
        <text class="input-label">Access Token</text>
        <input v-model="accessToken" class="input" placeholder="access_token" />
        <text class="input-label">Refresh Token（可选）</text>
        <input v-model="refreshToken" class="input" placeholder="refresh_token" />
        <text class="input-label">Client ID（可选）</text>
        <input v-model="clientId" class="input" placeholder="client_id" />
      </view>
      <text class="input-label">额外凭证 JSON（可选）</text>
      <textarea v-model="extraCredentialsJson" class="textarea" placeholder='例如：{"project_id":"abc","tier_id":2}' />
    </SectionCard>

    <SectionCard title="高级参数（可选）">
      <text class="input-label">并发 concurrency</text>
      <input v-model="concurrency" class="input" type="number" placeholder="例如：10" />
      <text class="input-label">优先级 priority</text>
      <input v-model="priority" class="input" type="number" placeholder="例如：0" />
      <text class="input-label">倍率 rate_multiplier</text>
      <input v-model="rateMultiplier" class="input" type="digit" placeholder="例如：1" />
      <text class="input-label">代理 ID proxy_id</text>
      <input v-model="proxyId" class="input" type="number" placeholder="例如：3" />
      <text class="input-label">分组 IDs（逗号分隔）</text>
      <input v-model="groupIds" class="input" placeholder="例如：1,2,5" />
      <text class="input-label">extra（可选，JSON 对象）</text>
      <textarea v-model="extraJson" class="textarea" placeholder='例如：{"window_cost_limit":50}' />
    </SectionCard>

    <NoticeBlock v-if="formError" type="error" :text="formError" class="mb-16" />
    <button class="btn btn-dark" :class="!canSubmit || submitting ? 'btn-disabled' : ''" :disabled="!canSubmit || submitting" @tap="submit">
      {{ submitting ? '提交中...' : '创建账号' }}
    </button>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import PageShell from '@/components/uni/PageShell.vue';
import HeroHeader from '@/components/uni/HeroHeader.vue';
import SectionCard from '@/components/uni/SectionCard.vue';
import NoticeBlock from '@/components/uni/NoticeBlock.vue';
import { createAccount } from '@/services/admin';
import type { AccountType, CreateAccountRequest } from '@/types/admin';
import { getErrorMessage, parseJsonObject, toGroupIds, toNumber } from '@/utils/format';

const platformOptions = ['anthropic', 'openai', 'gemini', 'sora', 'antigravity'];
const accountTypeOptions: AccountType[] = ['apikey', 'oauth', 'setup-token', 'upstream'];

const name = ref('');
const notes = ref('');
const platform = ref('anthropic');
const accountType = ref<AccountType>('apikey');
const baseUrl = ref('');
const apiKey = ref('');
const accessToken = ref('');
const refreshToken = ref('');
const clientId = ref('');
const concurrency = ref('');
const priority = ref('');
const rateMultiplier = ref('');
const proxyId = ref('');
const groupIds = ref('');
const extraCredentialsJson = ref('');
const extraJson = ref('');
const formError = ref('');
const submitting = ref(false);

const canSubmit = computed(() => {
  if (!name.value.trim()) return false;
  if (accountType.value === 'apikey') return Boolean(baseUrl.value.trim() && apiKey.value.trim());
  return Boolean(accessToken.value.trim());
});

async function submit() {
  formError.value = '';

  try {
    const credentialsFromJson = parseJsonObject(extraCredentialsJson.value, '额外凭证 JSON');
    const extra = parseJsonObject(extraJson.value, 'extra');
    const credentials = accountType.value === 'apikey'
      ? {
          ...credentialsFromJson,
          base_url: baseUrl.value.trim(),
          api_key: apiKey.value.trim(),
        }
      : {
          ...credentialsFromJson,
          access_token: accessToken.value.trim(),
          refresh_token: refreshToken.value.trim() || undefined,
          client_id: clientId.value.trim() || undefined,
        };

    const payload: CreateAccountRequest = {
      name: name.value.trim(),
      platform: platform.value,
      type: accountType.value,
      notes: notes.value.trim() || undefined,
      concurrency: toNumber(concurrency.value),
      priority: toNumber(priority.value),
      rate_multiplier: toNumber(rateMultiplier.value),
      proxy_id: toNumber(proxyId.value),
      group_ids: toGroupIds(groupIds.value),
      credentials,
      extra,
    };

    submitting.value = true;
    await createAccount(payload);
    uni.showToast({ title: '创建成功', icon: 'success' });
    uni.switchTab({ url: '/pages/accounts/index' });
  } catch (error) {
    formError.value = getErrorMessage(error, '创建账号失败，请稍后重试。');
  } finally {
    submitting.value = false;
  }
}
</script>
