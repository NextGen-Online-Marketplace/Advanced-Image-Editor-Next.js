import { NextRequest, NextResponse } from 'next/server';

import dbConnect from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-helpers';
import Tag from '@/src/models/Tag';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!currentUser.company) {
      return NextResponse.json({ 
        tags: [],
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
    const skip = (page - 1) * limit;

    const total = await Tag.countDocuments({ company: currentUser.company });
    const totalPages = Math.ceil(total / limit);

    const tags = await Tag.find({ company: currentUser.company })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({ 
      tags,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      }
    });
  } catch (error: any) {
    console.error('Get tags error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tags' },
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
    const {
      name,
      color,
      autoTagging,
      autoTagPerson,
      rules,
      removeTagOnRuleFail,
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    if (!color || typeof color !== 'string') {
      return NextResponse.json({ error: 'Tag color is required' }, { status: 400 });
    }

    // Validate color format (hex color)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorRegex.test(color)) {
      return NextResponse.json({ error: 'Invalid color format. Use hex color (e.g., #3b82f6)' }, { status: 400 });
    }

    if (autoTagging && !autoTagPerson) {
      return NextResponse.json({ error: 'Auto Tag Person is required when Auto Tagging is enabled' }, { status: 400 });
    }

    if (autoTagging && (!rules || !Array.isArray(rules) || rules.length === 0)) {
      return NextResponse.json({ error: 'At least one rule is required when Auto Tagging is enabled' }, { status: 400 });
    }

    // Validate rules
    if (rules && Array.isArray(rules)) {
      for (const rule of rules) {
        if (!rule.ruleType || !rule.condition || rule.count === undefined) {
          return NextResponse.json({ error: 'Each rule must have ruleType, condition, and count' }, { status: 400 });
        }
        if (rule.within && !rule.days) {
          return NextResponse.json({ error: 'Days is required when Within is selected' }, { status: 400 });
        }
      }
    }

    const tag = await Tag.create({
      name: name.trim(),
      color,
      autoTagging: Boolean(autoTagging),
      autoTagPerson: autoTagging ? autoTagPerson : undefined,
      rules: rules || [],
      removeTagOnRuleFail: Boolean(removeTagOnRuleFail),
      company: currentUser.company,
      createdBy: currentUser._id,
      updatedBy: currentUser._id,
    });

    return NextResponse.json(
      { message: 'Tag created successfully', tag: tag.toObject() },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create tag error:', error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'A tag with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create tag' },
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
    const {
      _id,
      name,
      color,
      autoTagging,
      autoTagPerson,
      rules,
      removeTagOnRuleFail,
    } = body;

    if (!_id) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    if (!color || typeof color !== 'string') {
      return NextResponse.json({ error: 'Tag color is required' }, { status: 400 });
    }

    // Validate color format
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorRegex.test(color)) {
      return NextResponse.json({ error: 'Invalid color format. Use hex color (e.g., #3b82f6)' }, { status: 400 });
    }

    if (autoTagging && !autoTagPerson) {
      return NextResponse.json({ error: 'Auto Tag Person is required when Auto Tagging is enabled' }, { status: 400 });
    }

    if (autoTagging && (!rules || !Array.isArray(rules) || rules.length === 0)) {
      return NextResponse.json({ error: 'At least one rule is required when Auto Tagging is enabled' }, { status: 400 });
    }

    // Validate rules
    if (rules && Array.isArray(rules)) {
      for (const rule of rules) {
        if (!rule.ruleType || !rule.condition || rule.count === undefined) {
          return NextResponse.json({ error: 'Each rule must have ruleType, condition, and count' }, { status: 400 });
        }
        if (rule.within && !rule.days) {
          return NextResponse.json({ error: 'Days is required when Within is selected' }, { status: 400 });
        }
      }
    }

    const tag = await Tag.findOneAndUpdate(
      { _id, company: currentUser.company },
      {
        name: name.trim(),
        color,
        autoTagging: Boolean(autoTagging),
        autoTagPerson: autoTagging ? autoTagPerson : undefined,
        rules: rules || [],
        removeTagOnRuleFail: Boolean(removeTagOnRuleFail),
        updatedBy: currentUser._id,
      },
      { new: true }
    );

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Tag updated successfully', tag: tag.toObject() }
    );
  } catch (error: any) {
    console.error('Update tag error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update tag' },
      { status: 500 }
    );
  }
}

