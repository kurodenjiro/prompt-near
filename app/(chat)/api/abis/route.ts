import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const account = req.nextUrl.searchParams.get('account') || '';

  try {
    const response = await fetch(
      `https://api.nearblocks.io/v1/account/${account}/contract/parse`
    );

    const data = await response.json();
    return NextResponse.json(data.contract[0].schema, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
