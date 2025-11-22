import { NextRequest, NextResponse } from 'next/server';

import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helpers';
import Agency from '@/src/models/Agency';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!currentUser.company) {
      return NextResponse.json({ 
        agencies: [],
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

    const total = await Agency.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const agencies = await Agency.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({ 
      agencies,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      }
    });
  } catch (error: any) {
    console.error('Get agencies error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch agencies' },
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
    const { name } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Agency name is required' }, { status: 400 });
    }

    const agency = await Agency.create({
      name: name.trim(),
      company: currentUser.company,
      createdBy: currentUser._id,
      updatedBy: currentUser._id,
    });

    return NextResponse.json(
      { message: 'Agency created successfully', agency: agency.toObject() },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create agency error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create agency' },
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
    const { _id, name } = body;

    if (!_id) {
      return NextResponse.json({ error: 'Agency ID is required' }, { status: 400 });
    }

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Agency name is required' }, { status: 400 });
    }

    const agency = await Agency.findOneAndUpdate(
      { _id, company: currentUser.company },
      {
        name: name.trim(),
        updatedBy: currentUser._id,
      },
      { new: true }
    );

    if (!agency) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Agency updated successfully', agency: agency.toObject() }
    );
  } catch (error: any) {
    console.error('Update agency error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update agency' },
      { status: 500 }
    );
  }
}

