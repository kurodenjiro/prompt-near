import { NextRequest, NextResponse } from 'next/server';
import { providers } from 'near-api-js';

import { contractTool, contractSolidityTool } from '@/ai/contract-tool';

export const maxDuration = 300;

const formatSourceCodePath = (path: String, lang: String) => {
  let segments = path ? path.split('/') : [];

  segments.pop();
  if (lang === 'rust') {
    segments.push('src');
  }

  return segments.join('/');
};

export async function GET(req: NextRequest) {
  const account = req.nextUrl.searchParams.get('account') || '';
  const methods = req.nextUrl.searchParams.get('methods') || '';
  const chain = req.nextUrl.searchParams.get('chain') || '';
  const network = req.nextUrl.searchParams.get('network') || '';

  try {
    if (network == 'near' && chain == 'mainnet') {
      const provider = new providers.JsonRpcProvider({
        url: 'https://rpc.mainnet.near.org',
      });
      const ipfs: any = await provider.query({
        request_type: 'call_function',
        account_id: 'v2-verifier.sourcescan.near',
        method_name: 'get_contract',
        args_base64: Buffer.from(
          JSON.stringify({ account_id: account })
        ).toString('base64'),
        finality: 'final',
      });
      const data = JSON.parse(Buffer.from(ipfs.result).toString());
      console.log('data', data);
      const sourcePath = formatSourceCodePath(data.entry_point, data.lang);

      const baseUrl = 'https://api.sourcescan.dev/api/ipfs/structure';
      const params = new URLSearchParams({
        cid: data.cid,
        path: sourcePath,
      });

      const urlWithParams = `${baseUrl}?${params.toString()}`;

      const response = await fetch(urlWithParams, {
        method: 'GET', // or 'POST' if needed
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const res = await response.json();
      const paths = res.structure.filter((file: any) => file.type === 'file');

      let mergeCode = '';
      for (const url of paths) {
        const response = await fetch(
          `https://api.sourcescan.dev/ipfs/${url.path}`
        );
        const res = await response.text();
        mergeCode += res + '\n\n';
      }
      const result = await contractTool({ mergeCode, account, methods });
      return NextResponse.json(JSON.parse(result), { status: 200 });
    }
    if (network == 'eth' && chain == 'mainnet') {
      const response = await fetch(
        `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${account}&apikey=${process.env.ETH_SCAN_API}`
      );

      const data = await response.json();
      const source = data.result[0].SourceCode;
      const result = await contractSolidityTool({ source, account, methods });
      return NextResponse.json(JSON.parse(result), {
        status: 200,
      });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
