import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import dbConnect from "@/lib/db";
import User from "@/src/models/User";
import Company from "@/src/models/Company";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!currentUser.company) {
      return NextResponse.json(
        { error: "User is not associated with a company" },
        { status: 400 }
      );
    }

    const inspectors = await User.find({
      company: currentUser.company,
      role: "inspector",
      isActive: true,
    })
      .select("_id firstName lastName email")
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    const company = await Company.findById(currentUser.company)
      .select("createdBy name")
      .populate("createdBy", "firstName lastName")
      .lean();

    const companyOwner = company?.createdBy
      ? {
          id: String((company.createdBy as any)._id),
          name: `${(company.createdBy as any).firstName} ${(company.createdBy as any).lastName}`.trim(),
        }
      : null;

    return NextResponse.json({
      inspectors: inspectors.map((inspector) => ({
        value: String(inspector._id),
        label: `${inspector.firstName} ${inspector.lastName}`.trim() || inspector.email,
      })),
      companyOwner,
    });
  } catch (error: any) {
    console.error("Error fetching form data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load form data" },
      { status: 500 }
    );
  }
}

