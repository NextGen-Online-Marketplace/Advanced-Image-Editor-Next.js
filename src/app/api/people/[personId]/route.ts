import { NextRequest, NextResponse } from 'next/server';

import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helpers';
import Person from '@/src/models/Person';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
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

    const { personId } = await params;

    const person = await Person.findOneAndDelete({
      _id: personId,
      company: currentUser.company,
    });

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Person deleted successfully' });
  } catch (error: any) {
    console.error('Delete person error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete person' },
      { status: 500 }
    );
  }
}

