<template>
  <view class="notice" :class="type === 'error' ? 'notice-error' : type === 'success' ? 'notice-success' : ''">
    <text class="notice-title" v-if="title">{{ title }}</text>
    <text class="notice-text">{{ text }}</text>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  text: string;
  type?: 'info' | 'error' | 'success';
}>();
</script>
