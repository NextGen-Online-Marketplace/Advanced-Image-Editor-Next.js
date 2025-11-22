import { NextRequest, NextResponse } from 'next/server';

import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helpers';
import Agent from '@/src/models/Agent';
import AgentTeam from '@/src/models/AgentTeam';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
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

    const { agentId } = await params;

    // Check if agent exists
    const agent = await Agent.findOne({
      _id: agentId,
      company: currentUser.company,
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Remove agent from all agent teams
    await AgentTeam.updateMany(
      {
        company: currentUser.company,
        agents: agentId,
      },
      {
        $pull: { agents: agentId },
        updatedBy: currentUser._id,
      }
    );

    // Delete the agent
    await Agent.deleteOne({
      _id: agentId,
      company: currentUser.company,
    });

    return NextResponse.json({ message: 'Agent deleted successfully' });
  } catch (error: any) {
    console.error('Delete agent error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete agent' },
      { status: 500 }
    );
  }
}

