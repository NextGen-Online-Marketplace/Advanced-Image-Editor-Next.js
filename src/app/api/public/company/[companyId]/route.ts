import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
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

    // Find company by ID
    const company = await Company.findById(companyId).lean();

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Return public company data (exclude sensitive fields)
    return NextResponse.json({
      company: {
        id: company._id.toString(),
        name: company.name,
        logoUrl: company.logoUrl,
        headerLogoUrl: company.headerLogoUrl,
        availabilityViewMode: company.availabilityViewMode || 'openSchedule',
        description: company.description,
        serviceOffered: company.serviceOffered,
        serviceArea: company.serviceArea,
        website: company.website,
        email: company.email,
        phone: company.phone,
        address: company.displayAddressPublicly ? company.address : undefined,
        city: company.displayAddressPublicly ? company.city : undefined,
        state: company.displayAddressPublicly ? company.state : undefined,
        zip: company.displayAddressPublicly ? company.zip : undefined,
        country: company.displayAddressPublicly ? company.country : undefined,
      },
    });
  } catch (error: any) {
    console.error('Get public company error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch company' },
      { status: 500 }
    );
  }
}

