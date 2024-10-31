import { NextRequest, NextResponse } from 'next/server';
import { providers } from 'near-api-js';

import { contractTool } from '@/ai/contract-tool';

export const maxDuration = 300;

const formatSourceCodePath = (path: String, lang: String) => {
  let segments = path.split('/');

  segments.pop();
  if (lang === 'rust') {
    segments.push('src');
  }

  return segments.join('/');
};

export async function GET(req: NextRequest) {
  const account = req.nextUrl.searchParams.get('account') || '';
  const methods = req.nextUrl.searchParams.get('methods') || '';

  try {
    const provider = new providers.JsonRpcProvider({
      url: 'https://rpc.mainnet.near.org',
    });
    const ipfs: any = await provider.query({
      request_type: 'call_function',
      account_id: 'dev.sourcescan.near',
      method_name: 'get_contract',
      args_base64: Buffer.from(
        JSON.stringify({ account_id: account })
      ).toString('base64'),
      finality: 'final',
    });
    const data = JSON.parse(Buffer.from(ipfs.result).toString());
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
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
