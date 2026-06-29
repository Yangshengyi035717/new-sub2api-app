<template>
  <view class="section-card">
    <view class="section-head" v-if="title || subtitle">
      <view>
        <text class="section-title" v-if="title">{{ title }}</text>
        <text class="section-subtitle" v-if="subtitle">{{ subtitle }}</text>
      </view>
      <slot name="right" />
    </view>
    <slot />
  </view>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  subtitle?: string;
}>();
</script>
