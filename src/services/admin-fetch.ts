import { adminConfigState } from '@/store/admin-config';
import type { ApiEnvelope } from '@/types/admin';

type AdminFetchOptions = {
  idempotencyKey?: string;
  timeout?: number;
  acceptEventStream?: boolean;
  allowBareJson?: boolean;
};

type UniRequestResponse = {
  data: unknown;
  statusCode: number;
  header?: unknown;
};

function buildRequestUrl(baseUrl: string, path: string) {
  const normalizedBase = baseUrl.trim().replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const duplicatedPrefixes = ['/api/v1', '/api'];

  for (const prefix of duplicatedPrefixes) {
    if (normalizedBase.endsWith(prefix) && normalizedPath.startsWith(`${prefix}/`)) {
      const baseWithoutPrefix = normalizedBase.slice(0, -prefix.length);
      return `${baseWithoutPrefix}${normalizedPath}`;
    }
  }

  return `${normalizedBase}${normalizedPath}`;
}

function getHeaderValue(headers: unknown, name: string) {
  if (!headers || typeof headers !== 'object') return '';
  const target = name.toLowerCase();
  const headerRecord = headers as Record<string, unknown>;

  for (const key in headerRecord) {
    if (key.toLowerCase() === target) {
      const value = headerRecord[key];
      return typeof value === 'string' ? value : '';
    }
  }

  return '';
}

function responseToText(data: unknown) {
  if (typeof data === 'string') return data;
  if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) return '[\u4e8c\u8fdb\u5236\u54cd\u5e94]';

  try {
    return JSON.stringify(data);
  } catch {
    return '';
  }
}

function previewResponse(text: string) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 160);
}

function parseJsonResponse<T>(data: unknown): ApiEnvelope<T> | undefined {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as ApiEnvelope<T>;
    } catch {
      return undefined;
    }
  }

  if (!data || typeof data !== 'object' || (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer)) {
    return undefined;
  }

  return data as ApiEnvelope<T>;
}

function getMessageFromEvent(event: Record<string, unknown>) {
  const candidates = [event.message, event.reason, event.error, event.content, event.text];
  const value = candidates.find((item) => typeof item === 'string' && item.trim());
  return typeof value === 'string' ? value.trim() : '';
}

function parseEventStream(text: string) {
  const events = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter((line) => line && line !== '[DONE]')
    .map((line) => {
      try {
        return JSON.parse(line) as Record<string, unknown>;
      } catch {
        return { message: line };
      }
    });

  const lastEvent = events[events.length - 1] || {};
  const eventType = typeof lastEvent.type === 'string' ? lastEvent.type : '';
  const message = getMessageFromEvent(lastEvent);
  const model = typeof lastEvent.model === 'string' ? lastEvent.model : '';
  const isFailed = /fail|error/i.test(eventType) || lastEvent.success === false;
  const isFinished = /success|done|complete|finish/i.test(eventType) || lastEvent.success === true;

  if (isFailed) {
    return {
      ok: false,
      message: `\u6d4b\u8bd5\u5931\u8d25\uff1a${message || '\u4e0a\u6e38\u8d26\u53f7\u8fd4\u56de\u5f02\u5e38\u3002'}`,
      eventType,
    };
  }

  if (isFinished) {
    return {
      ok: true,
      message: message || '\u6d4b\u8bd5\u6210\u529f\u3002',
      eventType,
    };
  }

  return {
    ok: true,
    message: message || `\u5df2\u8fde\u901a\uff1a\u7ba1\u7406\u63a5\u53e3\u8fd4\u56de\u6d41\u5f0f\u6d4b\u8bd5\u7ed3\u679c${model ? `\uff0c\u5df2\u5f00\u59cb\u6d4b\u8bd5 ${model}` : ''}\u3002\u5982\u957f\u65f6\u95f4\u6ca1\u6709\u6700\u7ec8\u7ed3\u679c\uff0c\u901a\u5e38\u662f\u4e0a\u6e38\u8d26\u53f7\u54cd\u5e94\u6162\u6216\u4e0d\u53ef\u7528\u3002`,
    eventType,
  };
}

function normalizeRequestError(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : responseToText(error);
  if (/timeout|timed out/i.test(message)) {
    return new Error('REQUEST_TIMEOUT');
  }
  return new Error(message || 'NETWORK_REQUEST_FAILED');
}

export async function adminFetch<T>(path: string, init: UniApp.RequestOptions = {}, options?: AdminFetchOptions): Promise<T> {
  const baseUrl = adminConfigState.baseUrl.trim().replace(/\/$/, '');
  const adminApiKey = adminConfigState.adminApiKey.trim();

  if (!baseUrl) throw new Error('BASE_URL_REQUIRED');
  if (!adminApiKey) throw new Error('ADMIN_API_KEY_REQUIRED');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': adminApiKey,
    ...((init.header as Record<string, string> | undefined) || {}),
  };

  if (options?.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }

  let response: UniRequestResponse;

  try {
    response = (await uni.request({
      ...init,
      url: buildRequestUrl(baseUrl, path),
      method: init.method || 'GET',
      header: headers,
      timeout: options?.timeout ?? init.timeout ?? 20000,
    })) as unknown as UniRequestResponse;
  } catch (error) {
    if (options?.acceptEventStream) {
      const requestError = normalizeRequestError(error);
      if (requestError.message === 'REQUEST_TIMEOUT') {
        throw new Error('ACCOUNT_TEST_STREAM_TIMEOUT');
      }
      throw requestError;
    }
    throw normalizeRequestError(error);
  }

  const statusCode = response.statusCode;
  const contentType = getHeaderValue(response.header, 'content-type').toLowerCase();
  const rawText = responseToText(response.data);

  if (options?.acceptEventStream && (contentType.includes('text/event-stream') || rawText.trim().startsWith('data:'))) {
    const streamResult = parseEventStream(rawText);
    if (statusCode >= 200 && statusCode < 300 && streamResult.ok) {
      return streamResult as T;
    }
    throw new Error(streamResult.message || '\u8d26\u53f7\u6d4b\u8bd5\u5931\u8d25\u3002');
  }

  const json = parseJsonResponse<T>(response.data);

  if (!json || typeof json !== 'object') {
    const preview = previewResponse(rawText);
    throw new Error(preview ? `\u670d\u52a1\u7aef\u8fd4\u56de\u4e86\u975e JSON \u6570\u636e\uff08HTTP ${statusCode}\uff09\uff1a${preview}` : 'INVALID_SERVER_RESPONSE');
  }

  if (options?.allowBareJson && typeof json.code !== 'number') {
    return json as T;
  }

  if (statusCode < 200 || statusCode >= 300 || json.code !== 0) {
    throw new Error(json.reason || json.message || 'REQUEST_FAILED');
  }

  return json.data as T;
}
