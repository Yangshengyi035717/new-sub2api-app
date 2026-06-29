<template>
  <view class="hero-panel">
    <view class="hero-copy">
      <text class="eyebrow" v-if="eyebrow">{{ eyebrow }}</text>
      <text class="hero-title">{{ title }}</text>
      <text class="hero-subtitle" v-if="subtitle">{{ subtitle }}</text>
    </view>
    <slot name="right" />
  </view>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
  eyebrow?: string;
}>();
</script>
