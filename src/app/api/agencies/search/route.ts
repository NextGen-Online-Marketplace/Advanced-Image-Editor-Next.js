import { NextRequest, NextResponse } from 'next/server';

import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helpers';
import Agency from '@/src/models/Agency';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!currentUser.company) {
      return NextResponse.json({ agencies: [] });
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

    const agencies = await Agency.find(query)
      .select('name')
      .limit(limit)
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ agencies });
  } catch (error: any) {
    console.error('Search agencies error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search agencies' },
      { status: 500 }
    );
  }
}

