import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, provider, model } = body;

    const data: Record<string, string> = {};
    if (title !== undefined) data.title = title;
    if (provider !== undefined) data.provider = provider;
    if (model !== undefined) data.model = model;

    const conversation = await db.conversation.update({
      where: { id },
      data,
    });

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Failed to update conversation:', error);
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
  }
}
