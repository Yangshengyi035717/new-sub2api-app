<template>
  <view class="stat-card" :class="tone ? `stat-card-${tone}` : ''">
    <text class="stat-label">{{ label }}</text>
    <text class="stat-value">{{ value }}</text>
    <text class="stat-detail" v-if="detail">{{ detail }}</text>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  value: string;
  detail?: string;
  tone?: 'primary' | 'danger' | 'warning';
}>();
</script>
