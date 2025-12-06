import mongoose from 'mongoose';
import Client from '@/src/models/Client';
import Agent from '@/src/models/Agent';
import Agency from '@/src/models/Agency';
import { getOrCreateCategories } from '@/lib/category-utils';

export interface ClientData {
  email?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  isCompany?: boolean;
  ccEmail?: string;
  phone?: string;
  categories?: string[];
  notes?: string;
  privateNotes?: string;
}

export interface AgentData {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  ccEmail?: string;
  agency?: string;
  photoUrl?: string;
  categories?: string[];
  notes?: string;
  privateNotes?: string;
}

/**
 * Create or update a client based on email
 * @param clientData - Client information
 * @param companyId - Company ObjectId
 * @param createdById - User ObjectId (optional for public API)
 * @returns Client ObjectId
 */
export async function createOrUpdateClient(
  clientData: ClientData,
  companyId: mongoose.Types.ObjectId,
  createdById?: mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId | null> {
  if (!clientData.email || !clientData.email.trim()) {
    return null;
  }

  const email = clientData.email.trim().toLowerCase();
  const categoryNames = clientData.categories || [];
  
  // Create or get categories using utility function
  const categoryIds = await getOrCreateCategories(
    categoryNames,
    companyId,
    createdById || companyId // Use companyId as fallback if no createdById
  );

  // Check if client exists by email
  const existingClient = await Client.findOne({
    email,
    company: companyId,
  });

  const isCompany = Boolean(clientData.isCompany);
  let clientId: mongoose.Types.ObjectId;
  
  if (existingClient) {
    // Update existing client
    const updateData: any = {
      isCompany,
      ccEmail: clientData.ccEmail?.trim() || existingClient.ccEmail,
      phone: clientData.phone?.trim() || existingClient.phone,
      categories: categoryIds.length > 0 ? categoryIds : existingClient.categories,
      internalNotes: clientData.notes?.trim() || existingClient.internalNotes,
      internalAdminNotes: clientData.privateNotes?.trim() || existingClient.internalAdminNotes,
    };

    if (createdById) {
      updateData.updatedBy = createdById;
    }

    if (isCompany) {
      updateData.companyName = clientData.companyName?.trim() || existingClient.companyName;
      updateData.firstName = undefined;
      updateData.lastName = undefined;
    } else {
      updateData.firstName = clientData.firstName?.trim() || existingClient.firstName;
      updateData.lastName = clientData.lastName?.trim() || existingClient.lastName;
      updateData.companyName = undefined;
    }

    await Client.findByIdAndUpdate(existingClient._id, updateData);
    clientId = existingClient._id as mongoose.Types.ObjectId;
  } else {
    // Create new client
    const createData: any = {
      isCompany,
      email,
      ccEmail: clientData.ccEmail?.trim(),
      phone: clientData.phone?.trim(),
      categories: categoryIds,
      internalNotes: clientData.notes?.trim(),
      internalAdminNotes: clientData.privateNotes?.trim(),
      company: companyId,
      createdBy: createdById || companyId, // Use companyId as fallback
      updatedBy: createdById,
    };

    if (isCompany) {
      createData.companyName = clientData.companyName?.trim();
    } else {
      createData.firstName = clientData.firstName?.trim();
      createData.lastName = clientData.lastName?.trim();
    }

    const newClient = await Client.create(createData);
    clientId = newClient._id as mongoose.Types.ObjectId;
  }

  return clientId;
}

/**
 * Create or update an agency
 * @param agencyNameOrId - Agency name or ObjectId
 * @param companyId - Company ObjectId
 * @param createdById - User ObjectId (optional for public API)
 * @returns Agency ObjectId or undefined
 */
export async function createOrUpdateAgency(
  agencyNameOrId: string,
  companyId: mongoose.Types.ObjectId,
  createdById?: mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId | undefined> {
  if (!agencyNameOrId) {
    return undefined;
  }

  if (mongoose.Types.ObjectId.isValid(agencyNameOrId)) {
    // Existing agency ID
    const existingAgency = await Agency.findOne({
      _id: agencyNameOrId,
      company: companyId,
    });
    if (existingAgency) {
      return existingAgency._id as mongoose.Types.ObjectId;
    }
  } else {
    // Create new agency
    const newAgency = await Agency.create({
      name: String(agencyNameOrId).trim(),
      company: companyId,
      createdBy: createdById || companyId,
      updatedBy: createdById,
    });
    return newAgency._id as mongoose.Types.ObjectId;
  }

  return undefined;
}

/**
 * Create or update an agent based on email
 * @param agentData - Agent information
 * @param companyId - Company ObjectId
 * @param createdById - User ObjectId (optional for public API)
 * @returns Agent ObjectId
 */
export async function createOrUpdateAgent(
  agentData: AgentData,
  companyId: mongoose.Types.ObjectId,
  createdById?: mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId | null> {
  if (!agentData.email || !agentData.email.trim()) {
    return null;
  }

  const agentEmail = agentData.email.trim().toLowerCase();
  const categoryNames = agentData.categories || [];
  
  // Create or get categories using utility function
  const categoryIds = await getOrCreateCategories(
    categoryNames,
    companyId,
    createdById || companyId
  );

  // Handle agency
  let agencyId: mongoose.Types.ObjectId | undefined = undefined;
  if (agentData.agency) {
    agencyId = await createOrUpdateAgency(agentData.agency, companyId, createdById);
  }

  // Check if agent exists by email
  const existingAgent = await Agent.findOne({
    email: agentEmail,
    company: companyId,
  });

  let agentId: mongoose.Types.ObjectId;

  if (existingAgent) {
    // Update existing agent
    const updateData: any = {
      firstName: agentData.firstName?.trim() || existingAgent.firstName,
      lastName: agentData.lastName?.trim() || existingAgent.lastName,
      ccEmail: agentData.ccEmail?.trim() || existingAgent.ccEmail,
      phone: agentData.phone?.trim() || existingAgent.phone,
      categories: categoryIds.length > 0 ? categoryIds : existingAgent.categories,
      internalNotes: agentData.notes?.trim() || existingAgent.internalNotes,
      internalAdminNotes: agentData.privateNotes?.trim() || existingAgent.internalAdminNotes,
    };

    if (createdById) {
      updateData.updatedBy = createdById;
    }

    if (agentData.photoUrl !== undefined) {
      updateData.photoUrl = agentData.photoUrl?.trim() || null;
    }

    if (agencyId !== undefined) {
      updateData.agency = agencyId;
    }

    await Agent.findByIdAndUpdate(existingAgent._id, updateData);
    agentId = existingAgent._id as mongoose.Types.ObjectId;
  } else {
    // Create new agent
    const createData: any = {
      firstName: agentData.firstName?.trim() || '',
      lastName: agentData.lastName?.trim(),
      email: agentEmail,
      ccEmail: agentData.ccEmail?.trim(),
      phone: agentData.phone?.trim(),
      photoUrl: agentData.photoUrl?.trim() || undefined,
      categories: categoryIds,
      internalNotes: agentData.notes?.trim(),
      internalAdminNotes: agentData.privateNotes?.trim(),
      company: companyId,
      createdBy: createdById || companyId,
      updatedBy: createdById,
    };

    if (agencyId) {
      createData.agency = agencyId;
    }

    const newAgent = await Agent.create(createData);
    agentId = newAgent._id as mongoose.Types.ObjectId;
  }

  return agentId;
}

