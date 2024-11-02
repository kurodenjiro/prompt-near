import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 300;

function convertDataToNearABI(input: any, account: string) {
  return {
    schema_version: '0.4.0',
    metadata: {
      name: account,
      version: '0.1.0',
      build: {
        compiler: 'solidity',
        builder: 'custom-builder',
      },
    },
    body: {
      functions: input
        .map((item: any) => {
          return {
            name: item.name,
            kind: item.stateMutability == 'view' ? 'view' : 'call',
            params: {
              serialization_type: 'json',
              args: item.inputs.map((input: any) => ({
                name: input.name,
                type_schema: { type: input.type },
              })),
            },
          };

          return null;
        })
        .filter(Boolean),
    },
  };
}

export async function GET(req: NextRequest) {
  const account = req.nextUrl.searchParams.get('account') || '';
  const chain = req.nextUrl.searchParams.get('chain') || '';
  const network = req.nextUrl.searchParams.get('network') || '';

  try {
    if (chain == 'eth' && network == 'mainnet') {
      const response = await fetch(
        `https://api.etherscan.io/api?module=contract&action=getabi&address=${account}&apikey=${process.env.ETH_SCAN_API}`
      );

      const data = await response.json();

      return NextResponse.json(JSON.parse(data.result), { status: 200 });
    }
    return NextResponse.json(
      { error: 'Unsupported chain or network' },
      { status: 400 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
