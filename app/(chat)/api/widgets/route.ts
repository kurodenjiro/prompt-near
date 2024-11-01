import { NextResponse } from 'next/server';
import { getWidgetsByUserId, createWidget, deleteWidget, updateWidget } from '@/db/queries';

// GET widgets by userId
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const widgets = await getWidgetsByUserId(userId);
    return NextResponse.json(widgets);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch widgets' }, { status: 500 });
  }
}

// POST new widget
export async function POST(request: Request) {
  try {
    const widget = await request.json();
    const newWidget = await createWidget(widget);
    return NextResponse.json(newWidget);
  } catch (error) {
    return NextResponse.json({ error: `Failed to create widget: ${error}` }, { status: 500 });
  }
}

// DELETE widget
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const widgetId = searchParams.get('widgetId');

  if (!widgetId) {
    return NextResponse.json({ error: 'Widget ID is required' }, { status: 400 });
  }

  try {
    await deleteWidget(widgetId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete widget' }, { status: 500 });
  }
}

// PATCH update widget
export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const widgetId = searchParams.get('widgetId');

  if (!widgetId) {
    return NextResponse.json({ error: 'Widget ID is required' }, { status: 400 });
  }

  try {
    const updates = await request.json();
    await updateWidget(widgetId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update widget' }, { status: 500 });
  }
}
