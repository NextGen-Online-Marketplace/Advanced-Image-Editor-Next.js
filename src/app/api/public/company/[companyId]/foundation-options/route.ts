import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import ReusableDropdown from '@/src/models/ReusableDropdown';
import Company from '@/src/models/Company';
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

    // Verify company exists
    const company = await Company.findById(companyId).lean();
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Find reusable dropdown for the company
    const dropdown = await ReusableDropdown.findOne({
      company: new mongoose.Types.ObjectId(companyId),
    }).lean();

    // Parse foundation options from comma-separated string
    const foundationString = dropdown?.foundation || '';
    const foundationValues = splitCommaSeparated(foundationString);

    // Return as array of options
    const foundationOptions = foundationValues.map((value) => ({
      value,
      label: value,
    }));

    return NextResponse.json({ foundationOptions });
  } catch (error: any) {
    console.error('Get public foundation options error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch foundation options' },
      { status: 500 }
    );
  }
}

