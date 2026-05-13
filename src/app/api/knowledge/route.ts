import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const docs = await db.knowledgeDoc.findMany({ orderBy: { updatedAt: 'desc' } });
    return NextResponse.json(docs);
  } catch (error) {
    console.error('Failed to fetch knowledge docs:', error);
    return NextResponse.json({ error: 'Failed to fetch knowledge docs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, type, source } = body;
    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }
    const doc = await db.knowledgeDoc.create({
      data: { title, content, type: type || 'text', source: source || null },
    });
    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error('Failed to create knowledge doc:', error);
    return NextResponse.json({ error: 'Failed to create knowledge doc' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    await db.knowledgeDoc.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete knowledge doc:', error);
    return NextResponse.json({ error: 'Failed to delete knowledge doc' }, { status: 500 });
  }
}
