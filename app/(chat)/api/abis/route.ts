import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const account = req.nextUrl.searchParams.get('account') || '';
  const chain = req.nextUrl.searchParams.get('chain') || '';
  const network = req.nextUrl.searchParams.get('network') || '';

  try {
    if (chain == 'near' && network == 'mainnet') {
      const response = await fetch(
        `https://api.nearblocks.io/v1/account/${account}/contract/parse`
      );

      const data = await response.json();
      return NextResponse.json(data.contract[0].schema, { status: 200 });
    }
    if (chain == 'eth' && network == 'mainnet') {
      const response = await fetch(
        `https://api.etherscan.io/api?module=contract&action=getabi&address=${account}&apikey=${process.env.ETH_SCAN_API}`
      );

      const data = await response.json();
      return NextResponse.json(JSON.parse(data.result), { status: 200 });
    }
    return NextResponse.json({ error: 'Unsupported chain or network' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
