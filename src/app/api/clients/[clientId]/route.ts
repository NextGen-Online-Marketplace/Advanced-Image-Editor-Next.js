import { NextRequest, NextResponse } from 'next/server';

import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helpers';
import Client from '@/src/models/Client';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
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

    const { clientId } = await params;

    const client = await Client.findOneAndDelete({
      _id: clientId,
      company: currentUser.company,
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Client deleted successfully' });
  } catch (error: any) {
    console.error('Delete client error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete client' },
      { status: 500 }
    );
  }
}

