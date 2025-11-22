import { NextRequest, NextResponse } from 'next/server';

import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helpers';
import AgentTeam from '@/src/models/AgentTeam';
import '@/src/models/Agent';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!currentUser.company) {
      return NextResponse.json({ 
        agentTeams: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        }
      });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { company: currentUser.company };

    // Add search filter (name search)
    if (search.trim()) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    const total = await AgentTeam.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const agentTeams = await AgentTeam.find(query)
      .populate('agents', 'firstName lastName email photoUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({ 
      agentTeams,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      }
    });
  } catch (error: any) {
    console.error('Get agent teams error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch agent teams' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!currentUser.company) {
      return NextResponse.json({ error: 'No company associated with user' }, { status: 400 });
    }

    const body = await request.json();
    const { name, agents } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    // Validate agents array
    const agentIds = Array.isArray(agents) ? agents.filter((id: any) => typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) : [];

    const agentTeam = await AgentTeam.create({
      name: name.trim(),
      agents: agentIds,
      company: currentUser.company,
      createdBy: currentUser._id,
      updatedBy: currentUser._id,
    });

    // Remove agents from their old teams first (since an agent can only belong to one team)
    if (agentIds.length > 0) {
      // Find all teams that contain any of these agents
      const oldTeams = await AgentTeam.find({
        company: currentUser.company,
        agents: { $in: agentIds },
        _id: { $ne: agentTeam._id }, // Exclude the current team
      });

      // Remove agents from their old teams
      for (const oldTeam of oldTeams) {
        await AgentTeam.findByIdAndUpdate(
          oldTeam._id,
          {
            $pull: { agents: { $in: agentIds } },
            updatedBy: currentUser._id,
          }
        );
      }
    }

    const populatedTeam = await AgentTeam.findById(agentTeam._id)
      .populate('agents', 'firstName lastName email photoUrl')
      .lean();

    return NextResponse.json(
      { message: 'Agent team created successfully', agentTeam: populatedTeam },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create agent team error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create agent team' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!currentUser.company) {
      return NextResponse.json({ error: 'No company associated with user' }, { status: 400 });
    }

    const body = await request.json();
    const { _id, name, agents } = body;

    if (!_id) {
      return NextResponse.json({ error: 'Agent team ID is required' }, { status: 400 });
    }

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    // Validate agents array
    const agentIds = Array.isArray(agents) ? agents.filter((id: any) => typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) : [];

    // Get current team to find old agents
    const currentTeam = await AgentTeam.findOne({ _id, company: currentUser.company });
    if (!currentTeam) {
      return NextResponse.json({ error: 'Agent team not found' }, { status: 404 });
    }

    const oldAgentIds = (currentTeam.agents || []).map((id: any) => id.toString());
    const newAgentIds = agentIds.map((id: string) => id.toString());

    // Find agents that were removed (in old but not in new)
    const removedAgentIds = oldAgentIds.filter((id: string) => !newAgentIds.includes(id));

    // Find agents that were added (in new but not in old)
    const addedAgentIds = newAgentIds.filter((id: string) => !oldAgentIds.includes(id));

    // Remove added agents from their old teams first (since an agent can only belong to one team)
    if (addedAgentIds.length > 0) {
      // Find all teams that contain any of these agents (excluding the current team)
      const oldTeams = await AgentTeam.find({
        company: currentUser.company,
        agents: { $in: addedAgentIds },
        _id: { $ne: _id }, // Exclude the current team
      });

      // Remove agents from their old teams
      for (const oldTeam of oldTeams) {
        await AgentTeam.findByIdAndUpdate(
          oldTeam._id,
          {
            $pull: { agents: { $in: addedAgentIds } },
            updatedBy: currentUser._id,
          }
        );
      }
    }

    const agentTeam = await AgentTeam.findOneAndUpdate(
      { _id, company: currentUser.company },
      {
        name: name.trim(),
        agents: agentIds,
        updatedBy: currentUser._id,
      },
      { new: true }
    )
      .populate('agents', 'firstName lastName email photoUrl')
      .lean();

    if (!agentTeam) {
      return NextResponse.json({ error: 'Agent team not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Agent team updated successfully', agentTeam }
    );
  } catch (error: any) {
    console.error('Update agent team error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update agent team' },
      { status: 500 }
    );
  }
}

