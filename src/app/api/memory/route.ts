import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const notes = await db.memoryNote.findMany({ orderBy: { updatedAt: 'desc' } });
    return NextResponse.json(notes);
  } catch (error) {
    console.error('Failed to fetch memory notes:', error);
    return NextResponse.json({ error: 'Failed to fetch memory notes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, source } = body;
    if (!key || !value) {
      return NextResponse.json({ error: 'Key and value are required' }, { status: 400 });
    }
    const note = await db.memoryNote.create({
      data: { key, value, source: source || 'manual' },
    });
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Failed to create memory note:', error);
    return NextResponse.json({ error: 'Failed to create memory note' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    await db.memoryNote.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete memory note:', error);
    return NextResponse.json({ error: 'Failed to delete memory note' }, { status: 500 });
  }
}
