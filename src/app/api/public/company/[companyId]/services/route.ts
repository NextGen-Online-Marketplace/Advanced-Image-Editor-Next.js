import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Service from '@/src/models/Service';
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

    // Find services for the company (exclude hidden from scheduler)
    const services = await Service.find({
      company: new mongoose.Types.ObjectId(companyId),
      hiddenFromScheduler: false,
    })
      .sort({ orderIndex: 1, createdAt: 1 })
      .lean();

    // Return services with pricing information for scheduler
    const publicServices = services.map((service) => ({
      _id: service._id.toString(),
      name: service.name,
      serviceCategory: service.serviceCategory,
      description: service.description,
      baseCost: service.baseCost,
      baseDurationHours: service.baseDurationHours,
      defaultInspectionEvents: service.defaultInspectionEvents,
      addOns: (service.addOns || []).map((addOn) => ({
        name: addOn.name,
        serviceCategory: addOn.serviceCategory,
        description: addOn.description,
        baseCost: addOn.baseCost,
        baseDurationHours: addOn.baseDurationHours,
        defaultInspectionEvents: addOn.defaultInspectionEvents,
        orderIndex: addOn.orderIndex,
      })),
      orderIndex: service.orderIndex,
    }));

    return NextResponse.json({ services: publicServices });
  } catch (error: any) {
    console.error('Get public services error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

