import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import SchedulingOptions from '@/src/models/SchedulingOptions';
import Company from '@/src/models/Company';

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

    // Find scheduling options for the company
    const optionsDoc = await SchedulingOptions.findOne({
      company: new mongoose.Types.ObjectId(companyId),
    }).lean();

    // Filter custom fields that should be shown in online scheduler
    const customFields = (optionsDoc?.customFields || [])
      .filter((field: any) => field.showInOnlineSchedulerOrGetQuote === true)
      .sort((a: any, b: any) => {
        const aOrder = a.orderIndex ?? 0;
        const bOrder = b.orderIndex ?? 0;
        return aOrder - bOrder;
      });

    return NextResponse.json({ customFields });
  } catch (error: any) {
    console.error('Get public custom fields error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch custom fields' },
      { status: 500 }
    );
  }
}

