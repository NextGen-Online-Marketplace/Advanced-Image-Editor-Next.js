import { NextRequest, NextResponse } from 'next/server';

import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helpers';
import Agency from '@/src/models/Agency';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ agencyId: string }> }
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

    const { agencyId } = await params;

    const agency = await Agency.findOneAndDelete({
      _id: agencyId,
      company: currentUser.company,
    });

    if (!agency) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Agency deleted successfully' });
  } catch (error: any) {
    console.error('Delete agency error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete agency' },
      { status: 500 }
    );
  }
}

