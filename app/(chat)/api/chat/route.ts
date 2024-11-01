import { convertToCoreMessages, Message, streamText, generateId } from 'ai';
import { z, ZodObject } from 'zod';
import { customModel } from '@/ai';
import { auth } from '@/app/(auth)/auth';
import { deleteChatById, getChatById, saveChat } from '@/db/queries';
import { Agent } from '@/db/schema';
import { widgetWithArgs } from '@/ai/widget-tool';
import { Web3 } from 'web3';

import { Model, models } from '@/lib/model';
import {
  convertParamsToZod,
  extractParameters,
  jsonSchemaToZodSchema,
  getUrl,
} from '@/components/utils/utils';
import { providers } from 'near-api-js';

type ParametersData = Record<string, any>; // Define the shape of ParametersData based on your requirements

// Schema for the `tool` object entries
interface ToolEntry {
  description: string;
  parameters: ZodObject<any>; // This can be refined to match `ParametersSchema` type
  execute: (ParametersData: ParametersData) => Promise<string>;
}
type ToolKey = `${string}_${string}_${string}`;
type Tool = Record<ToolKey, ToolEntry>;

export async function POST(request: Request) {
  const {
    id,
    messages,
    model,
    agent,
    tools,
  }: {
    id: string;
    messages: Array<Message>;
    model: Model['name'];
    agent: Agent;
    tools: Tool[];
  } = await request.json();

  const session = await auth();

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!models.find((m) => m.name === model)) {
    return new Response('Model not found', { status: 404 });
  }

  const toolData = tools.reduce((tool: any, item: any) => {
    if (item.typeName == 'contractTool') {
      const params = item.args.reduce(
        (acc: any, { name, type, description }: any) => {
          acc[name] = { type, description };
          return acc;
        },
        {}
      );
      const filteredObj: any = convertParamsToZod(params);
      const ParametersSchema: any = Object.fromEntries(
        Object.entries(filteredObj).filter(
          ([key, value]) => value !== undefined
        )
      );
      const [account] = item.name.split('::');
      tool[
        `cT${item.typeMethod == 'view' ? 'v' : 'c'}n0-${item.methods}0-${account.replace('.near', '')}0-${item.chain == 'near' ? 'n' : 'e'}`
      ] = {
        description: item.description,
        parameters: z.object(ParametersSchema),
        execute: async (ParametersData: ParametersData) => {
          if (item.chain == 'near' && item.typeMethod == 'view') {
            try {
              const provider = new providers.JsonRpcProvider({
                url: `https://rpc.${item.network}.near.org`,
              });
              const res: any = await provider.query({
                request_type: 'call_function',
                account_id: account,
                method_name: item.methods,
                args_base64: Buffer.from(
                  JSON.stringify(ParametersData)
                ).toString('base64'),
                finality: 'final',
              });
              const data = JSON.parse(Buffer.from(res.result).toString());

              let convertString;
              if (typeof data == 'object') {
                convertString = JSON.stringify(data);
              } else {
                convertString = data;
              }
              return `data : ${convertString}`;
            } catch (error) {
              console.log(error);
              return `Error calling contract method:${error}`;
            }
          }

          if (item.chain == 'near' && item.typeMethod == 'call') {
            const data = {
              request_type: 'call_function',
              account_id: account,
              method_name: item.methods,
              args_base64: Buffer.from(JSON.stringify(ParametersData)).toString(
                'base64'
              ),
              finality: 'final',
            };
            return `data: ${JSON.stringify(data)}`;
          }
          if (item.chain == 'eth' && item.typeMethod == 'call') {
            return `ETH calliing`;
          }
          if (item.chain == 'eth' && item.typeMethod == 'view') {
            try {
              const web3 = new Web3('https://1rpc.io/eth');
              const response = await fetch(
                `https://api.etherscan.io/api?module=contract&action=getabi&address=${account}&apikey=${process.env.ETH_SCAN_API}`
              );
              const data = await response.json();
              const abi = JSON.parse(data.result);
              const contract = new web3.eth.Contract(abi, account);
              const result = await contract.methods[item.methods]().call();
              let convertString;
              if (typeof result == 'object') {
                convertString = JSON.stringify(result);
              } else {
                convertString = result;
              }
              return `data: ${convertString}`;
            } catch (error) {
              return `Error calling contract method:${error}`;
            }
          }
          return 'i dont userstand . pls explain';
        },
      };
      //if view return data
    }
    if (item.typeName == 'widgetTool') {
      const filteredObj: any = item.args ? convertParamsToZod(item.args) : {};
      const ParametersSchema: any = Object.fromEntries(
        Object.entries(filteredObj).filter(
          ([key, value]) => value !== undefined
        )
      );

      tool[item.typeName + '0-' + generateId()] = {
        description: item.description,
        parameters: z.object(ParametersSchema),
        execute: async (ParametersSchema: ParametersData) => {
          const prompt = `${item.prompts} ${JSON.stringify(ParametersSchema)}`;
          const code = await widgetWithArgs({ prompt });
          console.log(code);
          return code;
        },
      };
    }
    if (item.typeName == 'apiTool') {
      const spec = item.spec;
      const baseUrl = spec.servers[0].url;
      for (const path in spec.paths) {
        // example of path: "/engines"
        const methods = spec.paths[path];
        for (const method in methods) {
          // example of method: "get"
          const spec = methods[method];
          const toolName = spec.operationId;
          const toolDesc = spec.description || spec.summary || toolName;

          let zodObj: any = {};
          if (spec.parameters) {
            // Get parameters with in = path
            let paramZodObjPath: any = {};
            for (const param of spec.parameters.filter(
              (param: any) => param.in === 'path'
            )) {
              paramZodObjPath = extractParameters(param, paramZodObjPath);
            }

            // Get parameters with in = query
            let paramZodObjQuery: any = {};
            for (const param of spec.parameters.filter(
              (param: any) => param.in === 'query'
            )) {
              paramZodObjQuery = extractParameters(param, paramZodObjQuery);
            }

            // Combine path and query parameters
            zodObj = {
              ...zodObj,
              PathParameters: z.object(paramZodObjPath),
              QueryParameters: z.object(paramZodObjQuery),
            };
          }

          if (spec.requestBody) {
            let content: any = {};
            if (spec.requestBody.content['application/json']) {
              content = spec.requestBody.content['application/json'];
            } else if (
              spec.requestBody.content['application/x-www-form-urlencoded']
            ) {
              content =
                spec.requestBody.content['application/x-www-form-urlencoded'];
            } else if (spec.requestBody.content['multipart/form-data']) {
              content = spec.requestBody.content['multipart/form-data'];
            } else if (spec.requestBody.content['text/plain']) {
              content = spec.requestBody.content['text/plain'];
            }
            const requestBodySchema = content.schema;
            if (requestBodySchema) {
              const requiredList = requestBodySchema.required || [];
              const requestBodyZodObj = jsonSchemaToZodSchema(
                requestBodySchema,
                requiredList,
                'properties'
              );
              zodObj = {
                ...zodObj,
                RequestBody: requestBodyZodObj,
              };
            } else {
              zodObj = {
                ...zodObj,
                input: z.string().describe('Query input').optional(),
              };
            }
          }

          if (!spec.parameters && !spec.requestBody) {
            zodObj = {
              input: z.string().describe('Query input').optional(),
            };
          }

          tool[item.typeName + '_' + toolName + '_' + generateId()] = {
            description: toolDesc,
            parameters: z.object(zodObj),
            execute: async (arg: any) => {
              const headers: any = {
                Accept: 'application/json',
              };

              if (item.accessToken) {
                headers.Authorization = `Bearer ${item.accessToken}`;
              }
              const callOptions: RequestInit = {
                method: method,
                headers: {
                  'Content-Type': 'application/json',
                  ...headers,
                },
              };
              if (arg.RequestBody && method.toUpperCase() !== 'GET') {
                callOptions.body = JSON.stringify(arg.RequestBody);
              }
              const completeUrl = getUrl(`${baseUrl}${path}`, arg);
              console.log(completeUrl);

              try {
                const response = await fetch(completeUrl, callOptions);
                const data = await response.json();
                return data;
              } catch (error) {
                console.error('Failed to make API request:', error);
                return `Failed to make API request: ${error}`;
              }
            },
          };
        }
      }
    }
    return tool;
  }, {});
  const coreMessages = convertToCoreMessages(messages);
  const result = await streamText({
    model: customModel(model),
    system: `Your name is ${agent.name} \n\n
       Your desciption is ${agent.description} \n\n
      ${agent.prompt}`,
    messages: coreMessages,
    maxSteps: 5,
    tools: toolData as any,
    onFinish: async ({ responseMessages }) => {
      if (session.user && session.user.id) {
        try {
          await saveChat({
            id,
            messages: [...coreMessages, ...responseMessages],
            userId: session.user.id,
            agentId: agent.id,
          });
        } catch (error) {
          console.error('Failed to save chat');
        }
      }
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'stream-text',
    },
  });

  return result.toDataStreamResponse({});
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}
