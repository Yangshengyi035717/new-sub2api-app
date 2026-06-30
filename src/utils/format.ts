export function formatCompactNumber(value?: number | null, digits = 1) {
  const number = Number(value ?? 0);
  const abs = Math.abs(number);

  if (!Number.isFinite(number)) return '--';
  if (abs >= 1_000_000_000_000) return `${(number / 1_000_000_000_000).toFixed(digits).replace(/\.0$/, '')}T`;
  if (abs >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(digits).replace(/\.0$/, '')}B`;
  if (abs >= 1_000_000) return `${(number / 1_000_000).toFixed(digits).replace(/\.0$/, '')}M`;
  if (abs >= 1_000) return `${(number / 1_000).toFixed(digits).replace(/\.0$/, '')}K`;
  return `${Math.round(number)}`;
}

export function formatTokenValue(value?: number | null) {
  return formatCompactNumber(value, 1);
}

export function formatNumber(value?: number | null) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return '--';
  const sign = number < 0 ? '-' : '';
  let text = `${Math.abs(Math.round(number))}`;
  let result = '';

  while (text.length > 3) {
    result = `,${text.slice(-3)}${result}`;
    text = text.slice(0, -3);
  }

  return `${sign}${text}${result}`;
}

export function formatMoney(value?: number | null, digits = 2) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return '--';
  return `$${number.toFixed(digits)}`;
}

export function formatDisplayTime(value?: string | null) {
  if (!value) return '--';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export type RangeKey = '24h' | '7d' | '30d';

export function getDateRange(rangeKey: RangeKey) {
  const end = new Date();
  const start = new Date();

  if (rangeKey === '24h') {
    start.setHours(end.getHours() - 23, 0, 0, 0);
  } else if (rangeKey === '30d') {
    start.setDate(end.getDate() - 29);
  } else {
    start.setDate(end.getDate() - 6);
  }

  const toDate = (value: Date) => value.toISOString().slice(0, 10);

  return {
    start_date: toDate(start),
    end_date: toDate(end),
    granularity: rangeKey === '24h' ? ('hour' as const) : ('day' as const),
  };
}

export function getPointLabel(value: string, rangeKey: RangeKey) {
  if (rangeKey === '24h') return value.slice(11, 13) || value;
  return value.slice(5, 10) || value;
}

export function getErrorMessage(error: unknown, fallback = '当前无法加载数据，请检查服务地址、Admin Key 和网络。') {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';

  switch (message) {
    case 'BASE_URL_REQUIRED':
      return '请先填写服务器地址。';
    case 'ADMIN_API_KEY_REQUIRED':
      return '请先填写 Admin Key。';
    case 'INVALID_SERVER_RESPONSE':
      return '当前地址返回的数据格式不正确，请确认它是可用的 Sub2API 管理接口。';
    case 'NETWORK_REQUEST_FAILED':
      return '网络请求失败，请检查手机网络、服务地址和证书配置。';
    case 'REQUEST_TIMEOUT':
      return '请求超时，服务端或上游账号长时间没有返回结果。';
    case 'ACCOUNT_TEST_STREAM_TIMEOUT':
      return '管理接口已连通，但账号测试是流式检测，当前上游账号长时间没有返回最终结果。';
    case 'ACCOUNT_TEST_STREAM_DISCONNECTED':
      return '流式测试连接在完成事件返回前提前断开，请重试或更换测试模型。';
    case 'REQUEST_FAILED':
      return '请求失败，请检查服务地址、Admin Key 和网络连通性。';
    default:
      return message || fallback;
  }
}

export function toTimeValue(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function toNumber(raw: string) {
  if (!raw.trim()) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export function toGroupIds(raw: string) {
  const values = raw
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);

  return values.length > 0 ? values : undefined;
}

export type JsonScalar = string | number | boolean | null | undefined;

export function parseJsonObject(raw: string, fieldLabel: string): Record<string, JsonScalar> {
  if (!raw.trim()) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${fieldLabel} 不是合法 JSON。`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${fieldLabel} 必须是 JSON 对象。`);
  }

  const parsedRecord = parsed as Record<string, unknown>;
  for (const key in parsedRecord) {
    const value = parsedRecord[key];
    const valueType = typeof value;
    if (value !== null && value !== undefined && valueType !== 'string' && valueType !== 'number' && valueType !== 'boolean') {
      throw new Error(`${fieldLabel} 仅支持 string / number / boolean / null。`);
    }
  }

  return parsed as Record<string, JsonScalar>;
}
