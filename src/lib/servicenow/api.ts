/**
 * ServiceNow Table API client with typed responses, pagination,
 * rate-limit handling, and exponential-backoff retry.
 */

import type {
  ServiceNowTableApiResponse,
  ServiceNowErrorResponse,
} from '@/types/servicenow';

// ─── Error Class ────────────────────────────────────────────────────────────

export class ServiceNowApiError extends Error {
  public readonly statusCode: number;
  public readonly responseBody: unknown;

  constructor(statusCode: number, message: string, responseBody?: unknown) {
    super(message);
    this.name = 'ServiceNowApiError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ServiceNowClientConfig {
  /** Full instance URL, e.g. 'https://customer.service-now.com' */
  instanceUrl: string;
  auth:
    | { type: 'basic'; username: string; password: string }
    | { type: 'oauth'; accessToken: string };
  /** Milliseconds to wait between paginated requests (default 200) */
  rateLimitDelay?: number;
  /** Maximum retry attempts on 5xx / 429 errors (default 3) */
  maxRetries?: number;
}

export interface QueryTableParams {
  table: string;
  query?: string;
  fields?: string[];
  limit?: number;
  offset?: number;
  displayValue?: boolean;
}

export interface QueryAllRecordsParams {
  table: string;
  query?: string;
  fields?: string[];
  /** Records per page (default 1000) */
  pageSize?: number;
  /** Hard cap to prevent runaway queries */
  maxRecords?: number;
  /** Called after each page with (fetchedSoFar, totalCount) */
  onProgress?: (fetched: number, total: number) => void;
}

export interface QueryTableResult<T> {
  results: T[];
  totalCount: number;
}

export interface ConnectionTestResult {
  success: boolean;
  version?: string;
  error?: string;
}

// ─── Client ─────────────────────────────────────────────────────────────────

export class ServiceNowClient {
  private baseUrl: string;
  private authHeader: string;
  private rateLimitDelay: number;
  private maxRetries: number;

  constructor(config: ServiceNowClientConfig) {
    // Strip trailing slash
    this.baseUrl = config.instanceUrl.replace(/\/+$/, '');

    if (config.auth.type === 'basic') {
      const encoded = Buffer.from(
        `${config.auth.username}:${config.auth.password}`,
      ).toString('base64');
      this.authHeader = `Basic ${encoded}`;
    } else {
      this.authHeader = `Bearer ${config.auth.accessToken}`;
    }

    this.rateLimitDelay = config.rateLimitDelay ?? 200;
    this.maxRetries = config.maxRetries ?? 3;
  }

  // ── Public Methods ──────────────────────────────────────────────────────

  /**
   * Query a ServiceNow table with optional filtering, field selection, and
   * pagination parameters. Returns typed results and the total record count.
   */
  async queryTable<T = Record<string, unknown>>(
    params: QueryTableParams,
  ): Promise<QueryTableResult<T>> {
    const searchParams: Record<string, string> = {};

    if (params.query) searchParams['sysparm_query'] = params.query;
    if (params.fields?.length)
      searchParams['sysparm_fields'] = params.fields.join(',');
    if (params.limit !== undefined)
      searchParams['sysparm_limit'] = String(params.limit);
    if (params.offset !== undefined)
      searchParams['sysparm_offset'] = String(params.offset);
    if (params.displayValue !== undefined)
      searchParams['sysparm_display_value'] = String(params.displayValue);

    const url = this.buildUrl(
      `/api/now/table/${params.table}`,
      searchParams,
    );

    const response = await this.makeRequest(url);
    const body = (await response.json()) as ServiceNowTableApiResponse<T>;
    const totalCount = parseInt(
      response.headers.get('X-Total-Count') ?? '0',
      10,
    );

    return { results: body.result, totalCount };
  }

  /**
   * Paginate through all matching records, respecting rate limits and an
   * optional record cap. Calls `onProgress` after each page.
   */
  async queryAllRecords<T = Record<string, unknown>>(
    params: QueryAllRecordsParams,
  ): Promise<T[]> {
    const pageSize = params.pageSize ?? 1000;
    const allRecords: T[] = [];
    let offset = 0;
    let totalCount = Infinity;

    while (offset < totalCount) {
      if (params.maxRecords && allRecords.length >= params.maxRecords) break;

      const effectiveLimit =
        params.maxRecords !== undefined
          ? Math.min(pageSize, params.maxRecords - allRecords.length)
          : pageSize;

      const page = await this.queryTable<T>({
        table: params.table,
        query: params.query,
        fields: params.fields,
        limit: effectiveLimit,
        offset,
      });

      totalCount = page.totalCount;
      allRecords.push(...page.results);
      offset += page.results.length;

      params.onProgress?.(allRecords.length, totalCount);

      // Break if we received fewer records than requested (last page)
      if (page.results.length < effectiveLimit) break;

      // Rate-limit pause between pages
      if (offset < totalCount) {
        await this.delay(this.rateLimitDelay);
      }
    }

    return allRecords;
  }

  /**
   * Fetch a single record by sys_id. Returns null if not found.
   */
  async getRecord<T = Record<string, unknown>>(
    table: string,
    sysId: string,
    fields?: string[],
  ): Promise<T | null> {
    const searchParams: Record<string, string> = {};
    if (fields?.length) searchParams['sysparm_fields'] = fields.join(',');

    const url = this.buildUrl(
      `/api/now/table/${table}/${sysId}`,
      searchParams,
    );

    try {
      const response = await this.makeRequest(url);
      const body = (await response.json()) as { result: T };
      return body.result ?? null;
    } catch (err) {
      if (err instanceof ServiceNowApiError && err.statusCode === 404) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Efficiently count records without fetching full payloads by requesting
   * a single record and reading the X-Total-Count header.
   */
  async getAggregateCount(
    table: string,
    query?: string,
  ): Promise<number> {
    const result = await this.queryTable({
      table,
      query,
      fields: ['sys_id'],
      limit: 1,
    });
    return result.totalCount;
  }

  /**
   * Lightweight connectivity test. Returns instance version when available.
   */
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const result = await this.queryTable<Record<string, unknown>>({
        table: 'sys_properties',
        query: 'name=glide.product.build',
        fields: ['name', 'value'],
        limit: 1,
      });

      const version =
        result.results.length > 0
          ? String(result.results[0].value ?? '')
          : undefined;

      return { success: true, version };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown connection error';
      return { success: false, error: message };
    }
  }

  // ── Private Helpers ─────────────────────────────────────────────────────

  /**
   * Core HTTP request handler with authentication, retry on 5xx, and
   * exponential back-off on 429 (rate limited).
   */
  private async makeRequest(
    url: string,
    retryCount = 0,
  ): Promise<Response> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // ── Auth failure — never retry ──
    if (response.status === 401) {
      const body = await this.safeParseJson(response);
      throw new ServiceNowApiError(
        401,
        'Authentication failed. Check your credentials or token.',
        body,
      );
    }

    // ── Rate limited — exponential back-off ──
    if (response.status === 429) {
      if (retryCount >= this.maxRetries) {
        throw new ServiceNowApiError(
          429,
          `Rate limited after ${this.maxRetries} retries`,
        );
      }
      const retryAfter = parseInt(
        response.headers.get('Retry-After') ?? '0',
        10,
      );
      const backoff = retryAfter * 1000 || this.rateLimitDelay * 2 ** retryCount;
      await this.delay(backoff);
      return this.makeRequest(url, retryCount + 1);
    }

    // ── Server error — retry with back-off ──
    if (response.status >= 500) {
      if (retryCount >= this.maxRetries) {
        const body = await this.safeParseJson(response);
        throw new ServiceNowApiError(
          response.status,
          `Server error (${response.status}) after ${this.maxRetries} retries`,
          body,
        );
      }
      const backoff = this.rateLimitDelay * 2 ** retryCount;
      await this.delay(backoff);
      return this.makeRequest(url, retryCount + 1);
    }

    // ── Other client errors ──
    if (!response.ok) {
      const body = await this.safeParseJson(response);
      const detail =
        (body as ServiceNowErrorResponse)?.error?.message ?? response.statusText;
      throw new ServiceNowApiError(response.status, detail, body);
    }

    return response;
  }

  private buildUrl(
    path: string,
    params: Record<string, string>,
  ): string {
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async safeParseJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
}
