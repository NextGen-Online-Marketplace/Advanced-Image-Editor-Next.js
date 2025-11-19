import { NextRequest, NextResponse } from 'next/server';

import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helpers';
import Tag from '@/src/models/Tag';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!currentUser.company) {
      return NextResponse.json({ tags: [] });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    const tags = await Tag.find({
      company: currentUser.company,
      name: { $regex: query, $options: 'i' },
    })
      .select('_id name color')
      .limit(20)
      .lean();

    return NextResponse.json({ tags });
  } catch (error: any) {
    console.error('Search tags error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search tags' },
      { status: 500 }
    );
  }
}

