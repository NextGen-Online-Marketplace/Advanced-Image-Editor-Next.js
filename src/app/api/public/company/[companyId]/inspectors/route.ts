import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Company from '@/src/models/Company';
import User from '@/src/models/User';
import Availability, { TimeBlock } from '@/src/models/Availability';
import type { DateSpecificAvailability, IAvailability } from '@/src/models/Availability';
import type { DayKey } from '@/src/constants/availability';
import { DAY_KEYS, normalizeDaysRecord } from '@/src/lib/availability-utils';

interface RouteParams {
  params: Promise<{
    companyId: string;
  }>;
}

type DayAvailabilityDoc = IAvailability["days"][number];

function formatAvailabilityResponse(availability: IAvailability[]) {
  const map = new Map<
    string,
    {
      days: Record<DayKey, { openSchedule: TimeBlock[]; timeSlots: string[] }>;
      dateSpecific: DateSpecificAvailability[];
    }
  >();

  availability.forEach((doc) => {
    const days = doc.days.reduce(
      (acc: Record<DayKey, { openSchedule: TimeBlock[]; timeSlots: string[] }>, day: DayAvailabilityDoc) => {
        acc[day.day as DayKey] = {
          openSchedule: day.openSchedule ?? [],
          timeSlots: day.timeSlots ?? [],
        };
        return acc;
      },
      {} as Record<DayKey, { openSchedule: TimeBlock[]; timeSlots: string[] }>
    );

    const normalized = normalizeDaysRecord(days);

    map.set(String(doc.inspector), {
      days: normalized,
      dateSpecific: doc.dateSpecific ?? [],
    });
  });

  return map;
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

    // Find company to get view mode and owner
    const company = await Company.findById(companyId)
      .select('createdBy availabilityViewMode')
      .lean();

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Get all active inspectors for the company
    const inspectors = await User.find({
      company: companyId,
      role: 'inspector',
      isActive: true,
    })
      .select('_id firstName lastName email profileImageUrl')
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    if (inspectors.length === 0) {
      return NextResponse.json({
        inspectors: [],
        companyOwnerId: company.createdBy ? String(company.createdBy) : null,
        viewMode: company.availabilityViewMode === 'timeSlots' ? 'timeSlots' : 'openSchedule',
      });
    }

    // Fetch availability data for all inspectors
    const availabilityDocs = (await Availability.find({
      company: companyId,
      inspector: { $in: inspectors.map((i) => i._id) },
    })) as unknown as IAvailability[];

    const availabilityMap = formatAvailabilityResponse(availabilityDocs);

    // Format response
    const response = inspectors.map((inspector) => {
      const inspectorId = String(inspector._id);
      const inspectorAvailability = availabilityMap.get(inspectorId);
      const days =
        inspectorAvailability?.days ??
        DAY_KEYS.reduce(
          (acc, day) => {
            acc[day] = { openSchedule: [], timeSlots: [] };
            return acc;
          },
          {} as Record<DayKey, { openSchedule: TimeBlock[]; timeSlots: string[] }>
        );

      return {
        inspectorId,
        inspectorName: `${inspector.firstName} ${inspector.lastName}`.trim(),
        inspectorFirstName: inspector.firstName,
        email: inspector.email,
        profileImageUrl: inspector.profileImageUrl,
        availability: {
          days,
          dateSpecific: inspectorAvailability?.dateSpecific ?? [],
        },
      };
    });

    const viewMode = company.availabilityViewMode === 'timeSlots' ? 'timeSlots' : 'openSchedule';
    const companyOwnerId = company.createdBy ? String(company.createdBy) : null;

    return NextResponse.json({
      inspectors: response,
      companyOwnerId,
      viewMode,
    });
  } catch (error: any) {
    console.error('Get public inspectors error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch inspectors' },
      { status: 500 }
    );
  }
}

