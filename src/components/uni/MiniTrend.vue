<template>
  <view class="trend-card">
    <view class="section-head">
      <view>
        <text class="section-title">{{ title }}</text>
        <text class="section-subtitle" v-if="subtitle">{{ subtitle }}</text>
      </view>
    </view>
    <view class="bars" v-if="points.length">
      <view v-for="item in normalizedPoints" :key="item.label" class="bar-cell">
        <view class="bar-track">
          <view class="bar-fill" :style="{ height: `${item.height}%`, background: color }" />
        </view>
        <text class="bar-label">{{ item.label }}</text>
      </view>
    </view>
    <view class="empty-inline" v-else>
      <text>暂无趋势数据</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  title: string;
  subtitle?: string;
  points: Array<{ label: string; value: number }>;
  color?: string;
}>(), {
  color: '#008ee8',
});

const normalizedPoints = computed(() => {
  const max = Math.max(...props.points.map((item) => item.value), 1);
  return props.points.map((item) => ({
    ...item,
    height: Math.max(8, Math.round((item.value / max) * 100)),
  }));
});
</script>
