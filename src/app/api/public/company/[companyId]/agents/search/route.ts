import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Agent from '@/src/models/Agent';

interface RouteParams {
  params: Promise<{
    companyId: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    await dbConnect();

    const { companyId } = await context.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return NextResponse.json(
        { error: 'Invalid company ID' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Build query
    const query: any = { company: companyId };

    // Add search filter (name or email search)
    if (search.trim()) {
      query.$or = [
        { firstName: { $regex: search.trim(), $options: 'i' } },
        { lastName: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const agents = await Agent.find(query)
      .select('firstName lastName email phone agency')
      .populate('agency', 'name')
      .limit(limit)
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    // Format response to include agency name
    const formattedAgents = agents.map((agent: any) => ({
      _id: agent._id,
      firstName: agent.firstName,
      lastName: agent.lastName,
      email: agent.email,
      phone: agent.phone,
      agencyName: agent.agency?.name || '',
      agency: agent.agency,
    }));

    return NextResponse.json({ agents: formattedAgents });
  } catch (error: any) {
    console.error('Search public agents error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search agents' },
      { status: 500 }
    );
  }
}

