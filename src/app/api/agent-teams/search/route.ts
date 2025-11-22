import { NextRequest, NextResponse } from 'next/server';

import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helpers';
import AgentTeam from '@/src/models/AgentTeam';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!currentUser.company) {
      return NextResponse.json({ agentTeams: [] });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Build query
    const query: any = { company: currentUser.company };

    // Add search filter (name search)
    if (search.trim()) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    const agentTeams = await AgentTeam.find(query)
      .select('name')
      .limit(limit)
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ agentTeams });
  } catch (error: any) {
    console.error('Search agent teams error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search agent teams' },
      { status: 500 }
    );
  }
}

