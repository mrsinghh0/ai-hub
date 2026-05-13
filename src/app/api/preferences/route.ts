import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    let prefs = await db.userPreferences.findFirst();
    if (!prefs) {
      prefs = await db.userPreferences.create({ data: {} });
    }
    return NextResponse.json(prefs);
  } catch (error) {
    console.error('Failed to fetch preferences:', error);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    let prefs = await db.userPreferences.findFirst();
    if (!prefs) {
      prefs = await db.userPreferences.create({ data: body });
    } else {
      prefs = await db.userPreferences.update({
        where: { id: prefs.id },
        data: body,
      });
    }
    return NextResponse.json(prefs);
  } catch (error) {
    console.error('Failed to update preferences:', error);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
