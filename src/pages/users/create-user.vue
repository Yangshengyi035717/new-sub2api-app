<template>
  <PageShell>
    <HeroHeader title="添加用户" subtitle="直接调用 /api/v1/admin/users 创建用户，保留原项目字段。" eyebrow="Create User" />

    <SectionCard title="基础信息">
      <text class="input-label">邮箱</text>
      <input v-model="email" class="input" placeholder="例如：user@example.com" />
      <text class="input-label">密码</text>
      <input v-model="password" class="input" password placeholder="请输入密码" />
      <text class="input-label">用户名（可选）</text>
      <input v-model="username" class="input" placeholder="例如：demo-user" />
      <text class="input-label">备注（可选）</text>
      <input v-model="notes" class="input" placeholder="例如：测试用户" />
    </SectionCard>

    <SectionCard title="权限与状态">
      <text class="input-label">角色</text>
      <view class="chip-row">
        <text class="chip" :class="role === 'user' ? 'chip-active' : ''" @tap="role = 'user'">user</text>
        <text class="chip" :class="role === 'admin' ? 'chip-active' : ''" @tap="role = 'admin'">admin</text>
      </view>
      <text class="input-label">状态</text>
      <view class="chip-row">
        <text class="chip" :class="status === 'active' ? 'chip-active' : ''" @tap="status = 'active'">active</text>
        <text class="chip" :class="status === 'disabled' ? 'chip-active' : ''" @tap="status = 'disabled'">disabled</text>
      </view>
    </SectionCard>

    <SectionCard title="高级参数（可选）">
      <text class="input-label">余额 balance</text>
      <input v-model="balance" class="input" type="digit" placeholder="例如：100" />
      <text class="input-label">并发 concurrency</text>
      <input v-model="concurrency" class="input" type="number" placeholder="例如：5" />
      <text class="input-label">extra（JSON 对象）</text>
      <textarea v-model="extraJson" class="textarea" placeholder='例如：{"daily_limit":10}' />
    </SectionCard>

    <NoticeBlock v-if="formError" type="error" :text="formError" class="mb-16" />
    <button class="btn btn-dark" :class="!canSubmit || submitting ? 'btn-disabled' : ''" :disabled="!canSubmit || submitting" @tap="submit">
      {{ submitting ? '提交中...' : '创建用户' }}
    </button>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import PageShell from '@/components/uni/PageShell.vue';
import HeroHeader from '@/components/uni/HeroHeader.vue';
import SectionCard from '@/components/uni/SectionCard.vue';
import NoticeBlock from '@/components/uni/NoticeBlock.vue';
import { createUser } from '@/services/admin';
import type { CreateUserRequest } from '@/types/admin';
import { getErrorMessage, parseJsonObject, toNumber } from '@/utils/format';

const email = ref('');
const password = ref('');
const username = ref('');
const notes = ref('');
const role = ref<'user' | 'admin'>('user');
const status = ref<'active' | 'disabled'>('active');
const balance = ref('');
const concurrency = ref('');
const extraJson = ref('');
const formError = ref('');
const submitting = ref(false);

const canSubmit = computed(() => Boolean(email.value.trim() && password.value.trim()));

async function submit() {
  formError.value = '';

  try {
    const extra = parseJsonObject(extraJson.value, 'extra');
    const payload: CreateUserRequest = {
      ...extra,
      email: email.value.trim(),
      password: password.value.trim(),
      username: username.value.trim() || undefined,
      notes: notes.value.trim() || undefined,
      role: role.value,
      status: status.value,
      balance: toNumber(balance.value),
      concurrency: toNumber(concurrency.value),
    };

    submitting.value = true;
    await createUser(payload);
    uni.showToast({ title: '创建成功', icon: 'success' });
    uni.switchTab({ url: '/pages/users/index' });
  } catch (error) {
    formError.value = getErrorMessage(error, '创建用户失败，请稍后重试。');
  } finally {
    submitting.value = false;
  }
}
</script>
