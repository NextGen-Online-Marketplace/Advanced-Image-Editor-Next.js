import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import { getCurrentUser } from '../../../../lib/auth-helpers';
import SchedulingOptions from '../../../../src/models/SchedulingOptions';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!currentUser.company) {
      return NextResponse.json({
        inProgressBookingsBlockSchedule: false,
        defaultConfirmed: false,
        allowClientCcEmails: false,
        captureBuyerAddress: false,
        captureClientsAgentAddress: false,
        captureListingAgentAddress: false,
      });
    }

    const optionsDoc = await SchedulingOptions.findOne({ company: currentUser.company });

    return NextResponse.json({
      inProgressBookingsBlockSchedule: optionsDoc?.inProgressBookingsBlockSchedule ?? false,
      defaultConfirmed: optionsDoc?.defaultConfirmed ?? false,
      allowClientCcEmails: optionsDoc?.allowClientCcEmails ?? false,
      captureBuyerAddress: optionsDoc?.captureBuyerAddress ?? false,
      captureClientsAgentAddress: optionsDoc?.captureClientsAgentAddress ?? false,
      captureListingAgentAddress: optionsDoc?.captureListingAgentAddress ?? false,
      customFields: optionsDoc?.customFields || [],
    });
  } catch (error: any) {
    console.error('Scheduling Options GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load scheduling options' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!currentUser.company) {
      return NextResponse.json(
        { error: 'Company not found. Please complete your profile first.' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Build update object
    const updateData: Record<string, any> = {
      inProgressBookingsBlockSchedule: Boolean(body.inProgressBookingsBlockSchedule),
      defaultConfirmed: Boolean(body.defaultConfirmed),
      allowClientCcEmails: Boolean(body.allowClientCcEmails),
      captureBuyerAddress: Boolean(body.captureBuyerAddress),
      captureClientsAgentAddress: Boolean(body.captureClientsAgentAddress),
      captureListingAgentAddress: Boolean(body.captureListingAgentAddress),
    };

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Use findOneAndUpdate with upsert to create or update
    const updatedOptions = await SchedulingOptions.findOneAndUpdate(
      { company: currentUser.company },
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
        upsert: true,
      }
    );

    if (!updatedOptions) {
      return NextResponse.json(
        { error: 'Failed to update scheduling options' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Scheduling options updated successfully',
      inProgressBookingsBlockSchedule: updatedOptions.inProgressBookingsBlockSchedule ?? false,
      defaultConfirmed: updatedOptions.defaultConfirmed ?? false,
      allowClientCcEmails: updatedOptions.allowClientCcEmails ?? false,
      captureBuyerAddress: updatedOptions.captureBuyerAddress ?? false,
      captureClientsAgentAddress: updatedOptions.captureClientsAgentAddress ?? false,
      captureListingAgentAddress: updatedOptions.captureListingAgentAddress ?? false,
    });
  } catch (error: any) {
    console.error('Scheduling Options PUT error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update scheduling options' },
      { status: 500 }
    );
  }
}

