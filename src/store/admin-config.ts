import { reactive } from 'vue';

const BASE_URL_KEY = 'sub2api_base_url';
const ADMIN_KEY_KEY = 'sub2api_admin_api_key';
const ACCOUNTS_KEY = 'sub2api_accounts';
const ACTIVE_ACCOUNT_ID_KEY = 'sub2api_active_account_id';
const IS_WEB = typeof window !== 'undefined';

export type AdminAccountProfile = {
  id: string;
  label: string;
  baseUrl: string;
  adminApiKey: string;
  updatedAt: string;
  enabled?: boolean;
};

export const adminConfigState = reactive({
  baseUrl: '',
  adminApiKey: '',
  accounts: [] as AdminAccountProfile[],
  activeAccountId: '',
  hydrated: false,
  saving: false,
});

function createAccountId() {
  return `acct_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getAccountLabel(baseUrl: string) {
  const normalized = baseUrl.replace(/^[a-z][a-z\d+\-.]*:\/\//i, '').split('/')[0]?.trim();
  return normalized || baseUrl;
}

function normalizeConfig(input: { baseUrl: string; adminApiKey: string }) {
  return {
    baseUrl: input.baseUrl.trim().replace(/\/$/, ''),
    adminApiKey: input.adminApiKey.trim(),
  };
}

function sortAccounts(accounts: AdminAccountProfile[]) {
  return [...accounts].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function normalizeAccount(account: AdminAccountProfile): AdminAccountProfile {
  return {
    ...account,
    adminApiKey: account.adminApiKey ?? '',
    enabled: account.enabled ?? true,
  };
}

function dedupeAccounts(accounts: AdminAccountProfile[]) {
  const seen = new Set<string>();
  const result: AdminAccountProfile[] = [];

  for (const account of accounts) {
    const dedupeKey = IS_WEB ? account.baseUrl : `${account.baseUrl}:${account.adminApiKey}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    result.push(account);
  }

  return result;
}

function sanitizeAccountsForWeb(accounts: AdminAccountProfile[]) {
  if (!IS_WEB) {
    return accounts;
  }

  return accounts.map((account) => ({
    ...account,
    adminApiKey: '',
  }));
}

function getNextActiveAccount(accounts: AdminAccountProfile[], activeAccountId?: string) {
  const enabledAccounts = accounts.filter((account) => account.enabled !== false);

  if (activeAccountId) {
    const preferred = enabledAccounts.find((account) => account.id === activeAccountId);
    if (preferred) return preferred;
  }

  return enabledAccounts[0];
}

function getItem(key: string) {
  try {
    return uni.getStorageSync(key) || '';
  } catch {
    return '';
  }
}

function setItem(key: string, value: string) {
  try {
    uni.setStorageSync(key, value);
  } catch {
    return;
  }
}

function deleteItem(key: string) {
  try {
    uni.removeStorageSync(key);
  } catch {
    return;
  }
}

function persistAdminApiKey(value: string) {
  if (IS_WEB) {
    deleteItem(ADMIN_KEY_KEY);
    return;
  }

  setItem(ADMIN_KEY_KEY, value);
}

function persistAccounts(accounts: AdminAccountProfile[]) {
  setItem(ACCOUNTS_KEY, JSON.stringify(sanitizeAccountsForWeb(accounts)));
}

export function hasAuthenticatedAdminSession(config: { baseUrl: string; adminApiKey: string }) {
  const hasBaseUrl = Boolean(config.baseUrl.trim());
  if (!hasBaseUrl) return false;
  if (!IS_WEB) return true;
  return Boolean(config.adminApiKey.trim());
}

export async function hydrateAdminConfig() {
  try {
    const baseUrl = getItem(BASE_URL_KEY);
    const adminApiKey = getItem(ADMIN_KEY_KEY);
    const rawAccounts = getItem(ACCOUNTS_KEY);
    const activeAccountId = getItem(ACTIVE_ACCOUNT_ID_KEY);

    let accounts: AdminAccountProfile[] = [];
    if (rawAccounts) {
      try {
        const parsed = JSON.parse(rawAccounts) as AdminAccountProfile[];
        accounts = Array.isArray(parsed) ? sanitizeAccountsForWeb(parsed.map((account) => normalizeAccount(account))) : [];
      } catch {
        accounts = [];
      }
    }

    if (accounts.length === 0 && baseUrl) {
      const legacyConfig = normalizeConfig({ baseUrl, adminApiKey: IS_WEB ? '' : adminApiKey });
      accounts = [
        {
          id: createAccountId(),
          label: getAccountLabel(legacyConfig.baseUrl),
          ...legacyConfig,
          updatedAt: new Date().toISOString(),
          enabled: true,
        },
      ];
    }

    const sortedAccounts = dedupeAccounts(sortAccounts(accounts));
    const activeAccount = getNextActiveAccount(sortedAccounts, activeAccountId || undefined);

    adminConfigState.accounts = sortedAccounts;
    adminConfigState.activeAccountId = activeAccount?.id || '';
    adminConfigState.baseUrl = activeAccount?.baseUrl || '';
    adminConfigState.adminApiKey = activeAccount?.adminApiKey || '';

    persistAccounts(sortedAccounts);
    if (activeAccount) {
      setItem(ACTIVE_ACCOUNT_ID_KEY, activeAccount.id);
      setItem(BASE_URL_KEY, activeAccount.baseUrl);
      persistAdminApiKey(activeAccount.adminApiKey);
    }
  } finally {
    adminConfigState.hydrated = true;
  }
}

export async function saveAdminConfig(input: { baseUrl: string; adminApiKey: string }) {
  adminConfigState.saving = true;

  try {
    const normalized = normalizeConfig(input);
    const nextUpdatedAt = new Date().toISOString();
    const existingAccount = adminConfigState.accounts.find((account) => {
      if (account.baseUrl !== normalized.baseUrl) return false;
      return account.adminApiKey === normalized.adminApiKey || (IS_WEB && !account.adminApiKey);
    });
    const nextAccount: AdminAccountProfile = existingAccount
      ? { ...existingAccount, label: getAccountLabel(normalized.baseUrl), updatedAt: nextUpdatedAt }
      : {
          id: createAccountId(),
          label: getAccountLabel(normalized.baseUrl),
          ...normalized,
          updatedAt: nextUpdatedAt,
          enabled: true,
        };

    const nextAccounts = dedupeAccounts(sortAccounts([nextAccount, ...adminConfigState.accounts.filter((account) => account.id !== nextAccount.id)]));

    setItem(BASE_URL_KEY, normalized.baseUrl);
    persistAdminApiKey(normalized.adminApiKey);
    persistAccounts(nextAccounts);
    setItem(ACTIVE_ACCOUNT_ID_KEY, nextAccount.id);

    adminConfigState.accounts = nextAccounts;
    adminConfigState.activeAccountId = nextAccount.id;
    adminConfigState.baseUrl = normalized.baseUrl;
    adminConfigState.adminApiKey = normalized.adminApiKey;
  } finally {
    adminConfigState.saving = false;
  }
}

export async function switchAdminAccount(accountId: string) {
  const account = adminConfigState.accounts.find((item) => item.id === accountId);
  if (!account || account.enabled === false) return;

  const nextAccount = { ...account, updatedAt: new Date().toISOString() };
  const nextAccounts = sortAccounts([nextAccount, ...adminConfigState.accounts.filter((item) => item.id !== accountId)]);

  setItem(BASE_URL_KEY, nextAccount.baseUrl);
  persistAdminApiKey(nextAccount.adminApiKey);
  persistAccounts(nextAccounts);
  setItem(ACTIVE_ACCOUNT_ID_KEY, nextAccount.id);

  adminConfigState.accounts = nextAccounts;
  adminConfigState.activeAccountId = nextAccount.id;
  adminConfigState.baseUrl = nextAccount.baseUrl;
  adminConfigState.adminApiKey = nextAccount.adminApiKey;
}

export async function removeAdminAccount(accountId: string) {
  const nextAccounts = adminConfigState.accounts.filter((item) => item.id !== accountId);
  const nextActiveAccount = getNextActiveAccount(nextAccounts, adminConfigState.activeAccountId === accountId ? '' : adminConfigState.activeAccountId);

  persistAccounts(nextAccounts);
  if (nextActiveAccount) {
    setItem(ACTIVE_ACCOUNT_ID_KEY, nextActiveAccount.id);
    setItem(BASE_URL_KEY, nextActiveAccount.baseUrl);
    persistAdminApiKey(nextActiveAccount.adminApiKey);
  } else {
    deleteItem(ACTIVE_ACCOUNT_ID_KEY);
    setItem(BASE_URL_KEY, '');
    persistAdminApiKey('');
  }

  adminConfigState.accounts = nextAccounts;
  adminConfigState.activeAccountId = nextActiveAccount?.id || '';
  adminConfigState.baseUrl = nextActiveAccount?.baseUrl || '';
  adminConfigState.adminApiKey = nextActiveAccount?.adminApiKey || '';
}

export async function logoutAdminAccount() {
  setItem(BASE_URL_KEY, '');
  persistAdminApiKey('');
  deleteItem(ACTIVE_ACCOUNT_ID_KEY);

  adminConfigState.activeAccountId = '';
  adminConfigState.baseUrl = '';
  adminConfigState.adminApiKey = '';
}
