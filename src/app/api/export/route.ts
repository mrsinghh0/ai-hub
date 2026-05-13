import { db } from '@/lib/db';

export async function GET() {
  try {
    const [conversations, messages, usageLogs, memories, knowledgeDocs, preferences] = await Promise.all([
      db.conversation.findMany(),
      db.message.findMany(),
      db.usageLog.findMany(),
      db.memoryNote.findMany(),
      db.knowledgeDoc.findMany(),
      db.userPreferences.findFirst(),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      conversations,
      messages,
      usageLogs,
      memories,
      knowledgeDocs,
      preferences,
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="ai-hub-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch {
    return Response.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
