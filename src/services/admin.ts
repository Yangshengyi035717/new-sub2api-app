import { adminFetch } from '@/services/admin-fetch';
import type {
  AccountListParams,
  AccountBulkUpdateResult,
  AdminDataImportResult,
  AdminDataPayload,
  AccountTodayStats,
  AccountTestResult,
  AccountModelOption,
  AdminAccount,
  AdminApiKey,
  AdminGroup,
  AdminSettings,
  AdminUser,
  BalanceOperation,
  DashboardModelStats,
  DashboardSnapshot,
  DashboardStats,
  DashboardTrend,
  CreateAccountRequest,
  CreateUserRequest,
  PaginatedData,
  UsageStats,
  UserUsageSummary,
} from '@/types/admin';

function buildQuery(params: Record<string, string | number | boolean | null | undefined>) {
  const parts: string[] = [];

  for (const key in params) {
    const value = params[key];
    if (value === undefined || value === null || value === '') continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }

  const query = parts.join('&');

  return query ? `?${query}` : '';
}

export function getDashboardStats() {
  return adminFetch<DashboardStats>('/api/v1/admin/dashboard/stats');
}

export function getAdminSettings() {
  return adminFetch<AdminSettings>('/api/v1/admin/settings');
}

export function getDashboardTrend(params: {
  start_date: string;
  end_date: string;
  granularity?: 'day' | 'hour';
  account_id?: number;
  group_id?: number;
  user_id?: number;
}) {
  return adminFetch<DashboardTrend>(`/api/v1/admin/dashboard/trend${buildQuery(params)}`);
}

export function getDashboardModels(params: { start_date: string; end_date: string }) {
  return adminFetch<DashboardModelStats>(`/api/v1/admin/dashboard/models${buildQuery(params)}`);
}

export function getDashboardSnapshot(params: {
  start_date: string;
  end_date: string;
  granularity?: 'day' | 'hour';
  account_id?: number;
  user_id?: number;
  group_id?: number;
  model?: string;
  request_type?: string;
  billing_type?: string | null;
  include_stats?: boolean;
  include_trend?: boolean;
  include_model_stats?: boolean;
  include_group_stats?: boolean;
  include_users_trend?: boolean;
}) {
  return adminFetch<DashboardSnapshot>(`/api/v1/admin/dashboard/snapshot-v2${buildQuery(params)}`);
}

export function getUsageStats(params: {
  start_date: string;
  end_date: string;
  user_id?: number;
  account_id?: number;
  group_id?: number;
  model?: string;
  request_type?: string;
  billing_type?: string | null;
}) {
  return adminFetch<UsageStats>(`/api/v1/admin/usage/stats${buildQuery(params)}`);
}

export function listUsers(search = '', page = 1, pageSize = 20) {
  return adminFetch<PaginatedData<AdminUser>>(`/api/v1/admin/users${buildQuery({ page, page_size: pageSize, search: search.trim() })}`);
}

export function getUser(userId: number) {
  return adminFetch<AdminUser>(`/api/v1/admin/users/${userId}`);
}

export function createUser(body: CreateUserRequest) {
  return adminFetch<AdminUser>('/api/v1/admin/users', {
    method: 'POST',
    data: body,
  });
}

export function getUserUsage(userId: number, period: 'day' | 'week' | 'month' = 'month') {
  return adminFetch<UserUsageSummary>(`/api/v1/admin/users/${userId}/usage${buildQuery({ period })}`);
}

export function listUserApiKeys(userId: number) {
  return adminFetch<PaginatedData<AdminApiKey>>(`/api/v1/admin/users/${userId}/api-keys${buildQuery({ page: 1, page_size: 100 })}`);
}

export function updateUserBalance(userId: number, body: { balance: number; operation: BalanceOperation; notes?: string }) {
  return adminFetch<AdminUser>(
    `/api/v1/admin/users/${userId}/balance`,
    {
      method: 'POST',
      data: body,
    },
    {
      idempotencyKey: `user-balance-${userId}-${Date.now()}`,
    }
  );
}

export function updateUserStatus(userId: number, status: 'active' | 'disabled') {
  return adminFetch<AdminUser>(`/api/v1/admin/users/${userId}`, {
    method: 'PUT',
    data: { status },
  });
}

export function listGroups(search = '', page = 1, pageSize = 20) {
  return adminFetch<PaginatedData<AdminGroup>>(`/api/v1/admin/groups${buildQuery({ page, page_size: pageSize, search: search.trim() })}`);
}

export function listAccounts(params: string | AccountListParams = '') {
  const normalized = typeof params === 'string' ? { search: params } : params;

  return adminFetch<PaginatedData<AdminAccount>>(`/api/v1/admin/accounts${buildQuery({
    page: normalized.page ?? 1,
    page_size: normalized.pageSize ?? 20,
    search: normalized.search?.trim(),
    platform: normalized.platform,
    type: normalized.type,
    status: normalized.status,
    privacy_mode: normalized.privacy,
    group: normalized.groupId,
    sort_by: normalized.sortBy,
    sort_order: normalized.sortOrder,
  })}`);
}

export function importAccountData(data: AdminDataPayload, skipDefaultGroupBind = true) {
  return adminFetch<AdminDataImportResult>('/api/v1/admin/accounts/data', {
    method: 'POST',
    data: {
      data,
      skip_default_group_bind: skipDefaultGroupBind,
    },
  });
}

export function bulkUpdateAccounts(accountIds: number[], updates: { group_ids?: number[]; confirm_mixed_channel_risk?: boolean }) {
  return adminFetch<AccountBulkUpdateResult>('/api/v1/admin/accounts/bulk-update', {
    method: 'POST',
    data: {
      account_ids: accountIds,
      ...updates,
    },
  });
}

export function getAccount(accountId: number) {
  return adminFetch<AdminAccount>(`/api/v1/admin/accounts/${accountId}`);
}

export function createAccount(body: CreateAccountRequest) {
  return adminFetch<AdminAccount>('/api/v1/admin/accounts', {
    method: 'POST',
    data: body,
  });
}

export function getAccountTodayStats(accountId: number) {
  return adminFetch<AccountTodayStats>(`/api/v1/admin/accounts/${accountId}/today-stats`);
}

export function getAccountModels(accountId: number) {
  return adminFetch<AccountModelOption[]>(`/api/v1/admin/accounts/${accountId}/models`);
}

export function testAccount(accountId: number, modelId?: string) {
  return adminFetch<AccountTestResult>(
    `/api/v1/admin/accounts/${accountId}/test`,
    {
      method: 'POST',
      data: modelId ? { model_id: modelId, prompt: '' } : undefined,
    },
    {
      acceptEventStream: true,
      allowBareJson: true,
      timeout: 30000,
    }
  );
}

export function refreshAccount(accountId: number) {
  return adminFetch(`/api/v1/admin/accounts/${accountId}/refresh`, {
    method: 'POST',
  });
}

export function setAccountSchedulable(accountId: number, schedulable: boolean) {
  return adminFetch<AdminAccount>(`/api/v1/admin/accounts/${accountId}/schedulable`, {
    method: 'POST',
    data: { schedulable },
  });
}
