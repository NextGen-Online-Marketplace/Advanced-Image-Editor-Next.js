import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import OnlineScheduler from '@/src/models/OnlineScheduler';
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

    // Find scheduler settings for the company
    const schedulerDoc = await OnlineScheduler.findOne({
      company: new mongoose.Types.ObjectId(companyId),
    }).lean();

    return NextResponse.json({
      onlineSchedulerEnabled: schedulerDoc?.onlineSchedulerEnabled ?? false,
      schedulingMinimumHours: schedulerDoc?.schedulingMinimumHours ?? 0,
      allowChoiceOfInspectors: schedulerDoc?.allowChoiceOfInspectors ?? true,
      hidePricing: schedulerDoc?.hidePricing ?? false,
      allowRequestNotes: schedulerDoc?.allowRequestNotes ?? false,
    });
  } catch (error: any) {
    console.error('Get public scheduler status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch scheduler status' },
      { status: 500 }
    );
  }
}

