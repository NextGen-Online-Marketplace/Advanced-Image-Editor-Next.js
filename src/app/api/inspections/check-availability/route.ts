import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-helpers";
import User from "@/src/models/User";
import Availability from "@/src/models/Availability";
import Company from "@/src/models/Company";
import type { IAvailability } from "@/src/models/Availability";
import type { DayKey } from "@/src/constants/availability";
import { normalizeDaysRecord } from "@/src/lib/availability-utils";
import { TimeBlock } from "@/src/models/Availability";

type DayAvailabilityDoc = IAvailability["days"][number];

function formatAvailabilityResponse(availability: IAvailability | null) {
  if (!availability) {
    return null;
  }

  const days = availability.days.reduce(
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

  return {
    days: normalized,
    dateSpecific: availability.dateSpecific ?? [],
  };
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const currentUser = await getCurrentUser(request);
    if (!currentUser || !currentUser.company) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const inspectorId = searchParams.get("inspectorId");
    const date = searchParams.get("date");

    if (!inspectorId) {
      return NextResponse.json({ error: "inspectorId is required" }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    // Verify inspector exists and belongs to the company
    const inspector = await User.findOne({
      _id: inspectorId,
      company: currentUser.company,
      role: "inspector",
      isActive: true,
    })
      .select("_id firstName lastName");

    if (!inspector) {
      return NextResponse.json({ error: "Inspector not found" }, { status: 404 });
    }

    // Fetch inspector's availability
    const availabilityDoc = (await Availability.findOne({
      company: currentUser.company,
      inspector: inspector._id,
    })) as unknown as IAvailability | null;

    const availability = formatAvailabilityResponse(availabilityDoc);

    // Get company view mode
    const company = await Company.findById(currentUser.company).select("availabilityViewMode");
    const viewMode = company?.availabilityViewMode === "timeSlots" ? "timeSlots" : "openSchedule";

    return NextResponse.json({
      availability: availability || {
        days: {} as Record<DayKey, { openSchedule: TimeBlock[]; timeSlots: string[] }>,
        dateSpecific: [],
      },
      viewMode,
      inspectorName: `${inspector.firstName} ${inspector.lastName}`.trim(),
    });
  } catch (error: any) {
    console.error("Check availability error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to check availability" },
      { status: 500 }
    );
  }
}

