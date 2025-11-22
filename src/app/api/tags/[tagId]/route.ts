import { NextRequest, NextResponse } from 'next/server';

import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helpers';
import Tag from '@/src/models/Tag';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    await dbConnect();

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!currentUser.company) {
      return NextResponse.json({ error: 'No company associated with user' }, { status: 400 });
    }

    const { tagId } = await params;

    const tag = await Tag.findOneAndDelete({
      _id: tagId,
      company: currentUser.company,
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Tag deleted successfully' });
  } catch (error: any) {
    console.error('Delete tag error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete tag' },
      { status: 500 }
    );
  }
}

