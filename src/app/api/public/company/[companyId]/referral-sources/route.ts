import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import ReusableDropdown from '@/src/models/ReusableDropdown';
import { splitCommaSeparated } from '@/lib/utils';

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

    const dropdown = await ReusableDropdown.findOne({
      company: companyId,
    }).lean();

    if (!dropdown || !dropdown.referralSources) {
      return NextResponse.json({ referralSources: [] });
    }

    // Parse comma-separated values into array of options
    const referralSourceValues = splitCommaSeparated(dropdown.referralSources || '');
    const referralSources = referralSourceValues.map((value) => ({
      value,
      label: value,
    }));

    return NextResponse.json({ referralSources });
  } catch (error: any) {
    console.error('Get public referral sources error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch referral sources' },
      { status: 500 }
    );
  }
}

