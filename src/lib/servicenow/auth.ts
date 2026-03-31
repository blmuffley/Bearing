/**
 * ServiceNow OAuth 2.0 and basic auth utilities.
 *
 * Supports the Authorization Code flow used by ServiceNow's OAuth provider
 * as well as plain basic-auth header construction.
 */

import type { ServiceNowOAuthTokenResponse } from '@/types/servicenow';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OAuthAuthUrlParams {
  instanceUrl: string;
  clientId: string;
  redirectUri: string;
  state?: string;
}

export interface ExchangeCodeParams {
  instanceUrl: string;
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface RefreshTokenParams {
  instanceUrl: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

export interface TokenResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ─── OAuth: Build Authorization URL ─────────────────────────────────────────

/**
 * Constructs the ServiceNow OAuth authorization URL that the user's browser
 * should be redirected to in order to initiate the Authorization Code flow.
 */
export function buildOAuthAuthUrl(params: OAuthAuthUrlParams): string {
  const base = params.instanceUrl.replace(/\/+$/, '');
  const url = new URL('/oauth_auth.do', base);

  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);

  if (params.state) {
    url.searchParams.set('state', params.state);
  }

  return url.toString();
}

// ─── OAuth: Exchange Authorization Code for Tokens ──────────────────────────

/**
 * Exchanges an authorization code received from the OAuth redirect for an
 * access token and refresh token pair.
 */
export async function exchangeCodeForToken(
  params: ExchangeCodeParams,
): Promise<TokenResult> {
  const base = params.instanceUrl.replace(/\/+$/, '');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
  });

  const response = await fetch(`${base}/oauth_token.do`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `OAuth token exchange failed (${response.status}): ${text}`,
    );
  }

  const data = (await response.json()) as ServiceNowOAuthTokenResponse;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

// ─── OAuth: Refresh an Expired Access Token ─────────────────────────────────

/**
 * Uses a refresh token to obtain a new access token when the current one
 * has expired.
 */
export async function refreshAccessToken(
  params: RefreshTokenParams,
): Promise<TokenResult> {
  const base = params.instanceUrl.replace(/\/+$/, '');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: params.refreshToken,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });

  const response = await fetch(`${base}/oauth_token.do`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `OAuth token refresh failed (${response.status}): ${text}`,
    );
  }

  const data = (await response.json()) as ServiceNowOAuthTokenResponse;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

// ─── Basic Auth ─────────────────────────────────────────────────────────────

/**
 * Builds a Base64-encoded Basic Authentication header value.
 * Returns the full header value including the "Basic " prefix.
 */
export function buildBasicAuth(username: string, password: string): string {
  const encoded = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${encoded}`;
}
