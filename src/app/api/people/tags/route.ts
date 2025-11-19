import { NextRequest, NextResponse } from 'next/server';

import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helpers';
import Person from '@/src/models/Person';
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

    // Get all unique tag IDs from people
    const people = await Person.find({ company: currentUser.company })
      .select('tags')
      .lean();

    const tagIds = new Set<string>();
    people.forEach((person) => {
      if (person.tags && Array.isArray(person.tags)) {
        person.tags.forEach((tagId: any) => {
          const id = typeof tagId === 'string' ? tagId : tagId.toString();
          tagIds.add(id);
        });
      }
    });

    // Get tag details
    const tags = await Tag.find({
      _id: { $in: Array.from(tagIds) },
      company: currentUser.company,
    })
      .select('_id name color')
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ tags });
  } catch (error: any) {
    console.error('Get people tags error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

