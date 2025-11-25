// lib/inspection.ts
import dbConnect from "./db";
import Inspection, { IInspection } from "@/src/models/Inspection";
import mongoose from "mongoose";

type CreateInspectionParams = {
  name: string;
  companyId: string;
  status?: string;
  date?: string | Date;
  createdBy?: string;
  inspector?: string;
  companyOwnerRequested?: boolean;
  enableClientCCEmail?: boolean;
  services?: Array<{
    serviceId: string;
    addOns?: Array<{
      name: string;
      addFee?: number;
      addHours?: number;
    }>;
  }>;
  discountCode?: string;
  location?: {
    address?: string;
    unit?: string;
    city?: string;
    state?: string;
    zip?: string;
    county?: string;
    squareFeet?: number;
    yearBuild?: number;
    foundation?: 'Basement' | 'Slab' | 'Crawlspace';
  };
  requirePaymentToReleaseReports?: boolean;
  paymentNotes?: string;
  orderId?: number;
  referralSource?: string;
  confirmedInspection?: boolean;
  disableAutomatedNotifications?: boolean;
  internalNotes?: string;
  customData?: Record<string, any>;
};

const formatInspection = (doc: IInspection | null) => {
  if (!doc) return null;
  return {
    _id: doc._id?.toString(),
    id: doc._id?.toString(),
    name: doc.name ?? "",
    status: doc.status ?? "Pending",
    date: doc.date ? new Date(doc.date).toISOString() : null,
    companyId: doc.companyId ? doc.companyId.toString() : null,
    createdBy: doc.createdBy ? doc.createdBy.toString() : null,
    inspector: doc.inspector ? doc.inspector.toString() : null,
    companyOwnerRequested: doc.companyOwnerRequested ?? false,
    enableClientCCEmail: doc.enableClientCCEmail ?? true,
    services: doc.services ?? null,
    discountCode: doc.discountCode ? doc.discountCode.toString() : null,
    location: doc.location ?? null,
    headerImage: doc.headerImage ?? null,
    headerText: doc.headerText ?? null,
    headerName: doc.headerName ?? null,
    headerAddress: doc.headerAddress ?? null,
    pdfReportUrl: doc.pdfReportUrl ?? null,
    htmlReportUrl: doc.htmlReportUrl ?? null,
    pdfReportGeneratedAt: doc.pdfReportGeneratedAt ? new Date(doc.pdfReportGeneratedAt).toISOString() : null,
    htmlReportGeneratedAt: doc.htmlReportGeneratedAt ? new Date(doc.htmlReportGeneratedAt).toISOString() : null,
    hidePricing: doc.hidePricing ?? false,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
  };
};

// 1. Create inspection scoped to a company
export async function createInspection({
  name,
  companyId,
  status,
  date,
  createdBy,
  inspector,
  companyOwnerRequested,
  enableClientCCEmail,
  services,
  discountCode,
  location,
  requirePaymentToReleaseReports,
  paymentNotes,
  orderId,
  referralSource,
  confirmedInspection,
  disableAutomatedNotifications,
  internalNotes,
  customData,
}: CreateInspectionParams) {
  if (!name || !companyId) {
    throw new Error("Missing required inspection fields");
  }

  await dbConnect();

  const inspectionData: any = {
    name: String(name).trim(),
    status: status ?? "Pending",
    date: date ? new Date(date) : new Date(),
    companyId: new mongoose.Types.ObjectId(companyId),
  };

  if (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) {
    inspectionData.createdBy = new mongoose.Types.ObjectId(createdBy);
  }

  if (inspector && mongoose.Types.ObjectId.isValid(inspector)) {
    inspectionData.inspector = new mongoose.Types.ObjectId(inspector);
  }

  if (companyOwnerRequested !== undefined) {
    inspectionData.companyOwnerRequested = companyOwnerRequested;
  }

  if (enableClientCCEmail !== undefined) {
    inspectionData.enableClientCCEmail = enableClientCCEmail;
  }

  if (services && Array.isArray(services)) {
    inspectionData.services = services.map(service => ({
      serviceId: new mongoose.Types.ObjectId(service.serviceId),
      addOns: service.addOns || [],
    }));
  }

  if (discountCode && mongoose.Types.ObjectId.isValid(discountCode)) {
    inspectionData.discountCode = new mongoose.Types.ObjectId(discountCode);
  }

  if (location) {
    inspectionData.location = {};
    if (location.address) inspectionData.location.address = String(location.address).trim();
    if (location.unit) inspectionData.location.unit = String(location.unit).trim();
    if (location.city) inspectionData.location.city = String(location.city).trim();
    if (location.state) inspectionData.location.state = String(location.state).trim();
    if (location.zip) inspectionData.location.zip = String(location.zip).trim();
    if (location.county) inspectionData.location.county = String(location.county).trim();
    if (location.squareFeet !== undefined) inspectionData.location.squareFeet = Number(location.squareFeet);
    if (location.yearBuild !== undefined) inspectionData.location.yearBuild = Number(location.yearBuild);
    if (location.foundation) inspectionData.location.foundation = location.foundation;
  }

  if (requirePaymentToReleaseReports !== undefined) {
    inspectionData.requirePaymentToReleaseReports = requirePaymentToReleaseReports;
  }

  if (paymentNotes !== undefined && paymentNotes.trim()) {
    inspectionData.paymentNotes = String(paymentNotes).trim();
  }

  if (orderId !== undefined) {
    inspectionData.orderId = orderId;
  }

  if (referralSource !== undefined && referralSource.trim()) {
    inspectionData.referralSource = String(referralSource).trim();
  }

  if (confirmedInspection !== undefined) {
    inspectionData.confirmedInspection = confirmedInspection;
  }

  if (disableAutomatedNotifications !== undefined) {
    inspectionData.disableAutomatedNotifications = disableAutomatedNotifications;
  }

  if (internalNotes !== undefined && internalNotes.trim()) {
    inspectionData.internalNotes = String(internalNotes).trim();
  }

  if (customData !== undefined && Object.keys(customData).length > 0) {
    inspectionData.customData = customData;
  }

  const inspection = await Inspection.create(inspectionData);
  return formatInspection(inspection);
}

// 2. Get all inspections for a company
export async function getAllInspections(companyId: string) {
  if (!companyId) {
    return [];
  }

  await dbConnect();

  const inspections = await Inspection.find({
    companyId: new mongoose.Types.ObjectId(companyId),
  })
    .sort({ updatedAt: -1 })
    .lean();

  return inspections.map((inspection) => formatInspection(inspection as IInspection)).filter(Boolean);
}

// 3. Get single inspection by ID
export async function getInspection(inspectionId: string) {
  if (!mongoose.Types.ObjectId.isValid(inspectionId)) {
    throw new Error('Invalid inspection ID format');
  }

  await dbConnect();

  const inspection = await Inspection.findById(inspectionId).lean();
  return formatInspection(inspection as IInspection);
}

// 4. Delete inspection
export async function deleteInspection(inspectionId: string) {
  if (!mongoose.Types.ObjectId.isValid(inspectionId)) {
    throw new Error('Invalid inspection ID format');
  }

  await dbConnect();

  const result = await Inspection.deleteOne({
    _id: new mongoose.Types.ObjectId(inspectionId)
  });

  return {
    deletedCount: result.deletedCount,
    acknowledged: result.acknowledged,
  };
}

// 5. Update inspection - can update any inspection field including headerImage and headerText
export async function updateInspection(inspectionId: string, data: Partial<{
  name: string;
  status: string;
  date: string | Date;
  headerImage: string;
  headerText: string; // legacy single-line header
  headerName: string; // new: name line
  headerAddress: string; // new: address line
  pdfReportUrl: string; // permanent PDF report URL
  htmlReportUrl: string; // permanent HTML report URL
  pdfReportGeneratedAt: Date; // timestamp when PDF was generated
  htmlReportGeneratedAt: Date; // timestamp when HTML was generated
  hidePricing: boolean; // hide cost estimates in all report formats
}>) {
  if (!mongoose.Types.ObjectId.isValid(inspectionId)) {
    throw new Error('Invalid inspection ID format');
  }

  await dbConnect();

  // Filter out undefined values to only update fields that are provided
  const updateData = Object.entries(data).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);

  if (Object.keys(updateData).length === 0) {
    return { matchedCount: 0, modifiedCount: 0 };
  }

  const result = await Inspection.updateOne(
    { _id: new mongoose.Types.ObjectId(inspectionId) },
    { $set: updateData }
  );

  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    acknowledged: result.acknowledged,
  };
}