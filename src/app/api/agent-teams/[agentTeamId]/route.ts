import { NextRequest, NextResponse } from 'next/server';

import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helpers';
import AgentTeam from '@/src/models/AgentTeam';
import Agent from '@/src/models/Agent';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ agentTeamId: string }> }
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

    const { agentTeamId } = await params;

    // Get team to find all agents before deleting
    const agentTeam = await AgentTeam.findOne({
      _id: agentTeamId,
      company: currentUser.company,
    });

    if (!agentTeam) {
      return NextResponse.json({ error: 'Agent team not found' }, { status: 404 });
    }

    // Clear agentTeam field from all agents in this team
    const agentIds = (agentTeam.agents || []).map((id: any) => id.toString());
    if (agentIds.length > 0) {
      await Agent.updateMany(
        {
          _id: { $in: agentIds },
          company: currentUser.company,
        },
        {
          $unset: { agentTeam: 1 },
          updatedBy: currentUser._id,
        }
      );
    }

    // Delete the agent team
    await AgentTeam.findOneAndDelete({
      _id: agentTeamId,
      company: currentUser.company,
    });

    return NextResponse.json({ message: 'Agent team deleted successfully' });
  } catch (error: any) {
    console.error('Delete agent team error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete agent team' },
      { status: 500 }
    );
  }
}

