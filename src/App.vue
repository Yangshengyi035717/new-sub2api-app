<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';
import { hydrateAdminConfig, hasAuthenticatedAdminSession, adminConfigState } from '@/store/admin-config';

onLaunch(async () => {
  await hydrateAdminConfig();

  const pages = getCurrentPages();
  const currentRoute = pages[pages.length - 1]?.route || '';
  if (!hasAuthenticatedAdminSession(adminConfigState) && currentRoute !== 'pages/login/index') {
    uni.reLaunch({ url: '/pages/login/index' });
  }
});
</script>

<style>
@import './styles.css';
</style>
