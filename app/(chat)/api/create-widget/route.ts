import { NextResponse } from 'next/server';
import { searchTool, widgetTool } from '@/ai/widget-tool';

export async function POST(request: Request) {
  try {
    const { prompt, tool_ids } = await request.json();
    const widgetPrompt = prompt;
    const data = {
      prompt: widgetPrompt,
      tool_ids: tool_ids,
    };
    console.log('Searching tools with data:', data);
    const tools = await searchTool(data);
    console.log('Search tools result:', tools);

    const prompts = widgetPrompt + tools;
    console.log('Creating widget with prompt:', prompts);
    const code = await widgetTool({ prompt: prompts, tool_ids });

    console.log('Created widget:', code);

    return NextResponse.json({ code });
  } catch (error) {
    console.error('Error creating widget:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { 
        error: `Failed to create widget: ${errorMessage}`,
        stack: errorStack 
      },
      { status: 500 }
    );
  }
}
