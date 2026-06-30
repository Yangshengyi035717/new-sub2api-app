export type ApiEnvelope<T> = {
  code: number;
  message: string;
  reason?: string;
  metadata?: Record<string, string>;
  data?: T;
};

export type PaginatedData<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type DashboardStats = {
  total_users: number;
  today_new_users: number;
  active_users: number;
  total_api_keys: number;
  active_api_keys: number;
  total_accounts: number;
  normal_accounts: number;
  error_accounts: number;
  total_requests: number;
  total_cost: number;
  total_tokens: number;
  today_requests: number;
  today_cost: number;
  today_tokens: number;
  today_input_tokens?: number;
  today_output_tokens?: number;
  today_cache_read_tokens?: number;
  rpm: number;
  tpm: number;
};

export type TrendPoint = {
  date: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  total_tokens: number;
  cost: number;
  actual_cost: number;
};

export type DashboardTrend = {
  start_date: string;
  end_date: string;
  granularity: 'day' | 'hour' | string;
  trend: TrendPoint[];
};

export type ModelStat = {
  model: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  total_tokens: number;
  cost: number;
  actual_cost: number;
};

export type DashboardModelStats = {
  start_date: string;
  end_date: string;
  models: ModelStat[];
};

export type UsageStats = {
  total_requests?: number;
  total_tokens?: number;
  total_input_tokens?: number;
  total_output_tokens?: number;
  total_cost?: number;
  total_actual_cost?: number;
  total_account_cost?: number;
  average_duration_ms?: number;
};

export type DashboardSnapshot = {
  trend?: TrendPoint[];
  models?: ModelStat[];
  groups?: Array<{
    group_id?: number;
    group_name?: string;
    requests?: number;
    total_tokens?: number;
    total_cost?: number;
    total_actual_cost?: number;
  }>;
};

export type AdminSettings = {
  site_name?: string;
  [key: string]: string | number | boolean | null | string[] | undefined;
};

export type AdminUser = {
  id: number;
  email: string;
  username?: string | null;
  balance?: number;
  concurrency?: number;
  status?: string;
  role?: string;
  current_concurrency?: number;
  notes?: string | null;
  last_active_at?: string | null;
  last_used_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type UserUsageSummary = {
  total_requests?: number;
  total_tokens?: number;
  total_cost?: number;
  requests?: number;
  tokens?: number;
  cost?: number;
  [key: string]: string | number | boolean | null | undefined;
};

export type AdminApiKey = {
  id: number;
  user_id: number;
  key: string;
  name: string;
  group_id?: number | null;
  status: string;
  quota: number;
  quota_used: number;
  last_used_at?: string | null;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
  usage_5h?: number;
  usage_1d?: number;
  usage_7d?: number;
  group?: AdminGroup;
  user?: {
    id: number;
    email?: string;
    username?: string | null;
  };
};

export type BalanceOperation = 'set' | 'add' | 'subtract';

export type AdminGroup = {
  id: number;
  name: string;
  description?: string | null;
  platform: string;
  rate_multiplier?: number;
  is_exclusive?: boolean;
  status?: string;
  subscription_type?: string;
  daily_limit_usd?: number | null;
  weekly_limit_usd?: number | null;
  monthly_limit_usd?: number | null;
  account_count?: number;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

export type AnnouncementStatus = 'draft' | 'active' | 'archived';

export type AnnouncementNotifyMode = 'silent' | 'popup';

export type AnnouncementConditionType = 'subscription' | 'balance';

export type AnnouncementOperator = 'in' | 'gt' | 'gte' | 'lt' | 'lte' | 'eq';

export type AnnouncementCondition = {
  type: AnnouncementConditionType;
  operator: AnnouncementOperator;
  group_ids?: number[];
  value?: number;
};

export type AnnouncementConditionGroup = {
  all_of?: AnnouncementCondition[];
};

export type AnnouncementTargeting = {
  any_of?: AnnouncementConditionGroup[];
};

export type AdminAnnouncement = {
  id: number;
  title: string;
  content: string;
  status: AnnouncementStatus | string;
  notify_mode: AnnouncementNotifyMode | string;
  targeting?: AnnouncementTargeting;
  starts_at?: string | null;
  ends_at?: string | null;
  created_by?: number | null;
  updated_by?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type AnnouncementListParams = {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type CreateAnnouncementRequest = {
  title: string;
  content: string;
  status?: AnnouncementStatus;
  notify_mode?: AnnouncementNotifyMode;
  targeting?: AnnouncementTargeting;
  starts_at?: number;
  ends_at?: number;
};

export type UpdateAnnouncementRequest = {
  title?: string;
  content?: string;
  status?: AnnouncementStatus;
  notify_mode?: AnnouncementNotifyMode;
  targeting?: AnnouncementTargeting;
  starts_at?: number;
  ends_at?: number;
};


export type AccountListParams = {
  search?: string;
  page?: number;
  pageSize?: number;
  platform?: string;
  type?: string;
  status?: string;
  privacy?: string;
  groupId?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type AdminDataPayload = Record<string, unknown>;

export type AdminDataImportError = {
  kind: 'proxy' | 'account';
  name?: string;
  proxy_key?: string;
  message: string;
};

export type AdminDataImportResult = {
  proxy_created: number;
  proxy_reused: number;
  proxy_failed: number;
  account_created: number;
  account_failed: number;
  errors?: AdminDataImportError[];
};

export type AccountBulkUpdateResult = {
  success?: number;
  total?: number;
  failed?: number;
  errors?: Array<{ id?: number; message?: string }>;
  [key: string]: unknown;
};

export type AccountTodayStats = {
  requests: number;
  tokens: number;
  cost: number;
  standard_cost?: number;
  user_cost?: number;
};

export type AccountTestResult = {
  ok: boolean;
  message: string;
  eventType?: string;
};

export type AccountModelOption = {
  id: string;
  display_name?: string;
  name?: string;
  model?: string;
};

export type AdminAccount = {
  id: number;
  name: string;
  platform: string;
  type: string;
  status?: string;
  schedulable?: boolean;
  priority?: number;
  concurrency?: number;
  current_concurrency?: number;
  rate_multiplier?: number;
  error_message?: string;
  is_private?: boolean;
  privacy?: string;
  updated_at?: string;
  last_used_at?: string | null;
  rate_limit_reset_at?: string | null;
  temp_unschedulable_until?: string | null;
  group_ids?: number[];
  groups?: AdminGroup[];
  extra?: Record<string, unknown>;
};

export type AccountType = 'apikey' | 'oauth' | 'setup-token' | 'upstream';

export type CreateAccountRequest = {
  name: string;
  platform: string;
  type: AccountType;
  credentials: Record<string, string | number | boolean | null | undefined>;
  extra?: Record<string, string | number | boolean | null | undefined>;
  notes?: string;
  proxy_id?: number;
  concurrency?: number;
  priority?: number;
  rate_multiplier?: number;
  group_ids?: number[];
};

export type CreateUserRequest = {
  email: string;
  password: string;
  username?: string;
  notes?: string;
  role?: 'user' | 'admin';
  status?: 'active' | 'disabled';
  balance?: number;
  concurrency?: number;
  [key: string]: string | number | boolean | null | undefined;
};
