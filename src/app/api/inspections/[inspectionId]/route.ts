import { NextResponse } from "next/server";
import { deleteInspection, updateInspection } from "@/lib/inspection";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ inspectionId: string }> }
) {
  try {
    const { inspectionId } = await params;
    
    if (!inspectionId) {
      return NextResponse.json(
        { error: "Inspection ID is required" },
        { status: 400 }
      );
    }

    // Import client directly since we don't have a getInspection function yet
    const { default: clientPromise } = await import("@/lib/mongodb");
    const client = await clientPromise;
    const db = client.db("agi_inspections_db");
    
    const { ObjectId } = await import("mongodb");
    if (!ObjectId.isValid(inspectionId)) {
      return NextResponse.json(
        { error: "Invalid inspection ID format" },
        { status: 400 }
      );
    }

    const inspection = await db.collection("inspections").findOne({
      _id: new ObjectId(inspectionId)
    });

    if (!inspection) {
      return NextResponse.json(
        { error: "Inspection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(inspection);
  } catch (error: any) {
    console.error("Error fetching inspection:", error);
    
    return NextResponse.json(
      { error: error.message || "Failed to fetch inspection" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ inspectionId: string }> }
) {
  try {
    const { inspectionId } = await params;
    
    console.log('Updating inspection ID:', inspectionId);
    
    if (!inspectionId) {
      return NextResponse.json(
        { error: "Inspection ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const result = await updateInspection(inspectionId, body);

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Inspection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        message: "Inspection updated successfully",
        modifiedCount: result.modifiedCount 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating inspection:", error);
    
    if (error.message.includes("Invalid inspection ID format")) {
      return NextResponse.json(
        { error: "Invalid inspection ID format" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to update inspection" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ inspectionId: string }> }
) {
  try {
    const { inspectionId } = await params;
    
    console.log('Deleting inspection ID:', inspectionId);
    
    if (!inspectionId) {
      return NextResponse.json(
        { error: "Inspection ID is required" },
        { status: 400 }
      );
    }

    const result = await deleteInspection(inspectionId);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Inspection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        message: "Inspection deleted successfully",
        deletedCount: result.deletedCount 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting inspection:", error);
    
    if (error.message.includes("Invalid inspection ID format")) {
      return NextResponse.json(
        { error: "Invalid inspection ID format" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to delete inspection" },
      { status: 500 }
    );
  }
}