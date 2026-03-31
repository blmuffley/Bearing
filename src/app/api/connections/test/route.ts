import { NextRequest, NextResponse } from 'next/server';
import { ServiceNowClient } from '@/lib/servicenow/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instanceUrl, auth } = body;

    if (!instanceUrl || !auth) {
      return NextResponse.json(
        { success: false, error: 'Missing instanceUrl or auth' },
        { status: 400 },
      );
    }

    if (auth.type === 'basic' && (!auth.username || !auth.password)) {
      return NextResponse.json(
        { success: false, error: 'Missing username or password for basic auth' },
        { status: 400 },
      );
    }

    const client = new ServiceNowClient({
      instanceUrl,
      auth:
        auth.type === 'basic'
          ? { type: 'basic', username: auth.username, password: auth.password }
          : { type: 'oauth', accessToken: auth.accessToken },
    });

    const result = await client.testConnection();

    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown error during connection test';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
