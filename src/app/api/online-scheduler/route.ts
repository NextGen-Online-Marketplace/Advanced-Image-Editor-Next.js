import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import { getCurrentUser } from '../../../../lib/auth-helpers';
import OnlineScheduler from '../../../../src/models/OnlineScheduler';

const sanitizeString = (value?: string | null) => {
  if (value === undefined || value === null) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!currentUser.company) {
      return NextResponse.json({
        onlineSchedulerEnabled: false,
        displayContactInfoBeforeDateSelection: false,
        schedulingMinimumHours: 0,
        allowChoiceOfInspectors: true,
        hidePricing: false,
        showClientPricingDetails: false,
        allowRequestNotes: false,
        requireConfirmation: true,
        confirmationText: '',
        googleAnalyticsNumber: '',
        emailForCompleteBooking: false,
        emailForInProgressBooking: false,
        emailNotificationAddress: '',
        smsForCompleteBooking: false,
        smsForInProgressBooking: false,
        smsNotificationNumber: '',
      });
    }

    const schedulerDoc = await OnlineScheduler.findOne({ company: currentUser.company });

    return NextResponse.json({
      onlineSchedulerEnabled: schedulerDoc?.onlineSchedulerEnabled ?? false,
      displayContactInfoBeforeDateSelection: schedulerDoc?.displayContactInfoBeforeDateSelection ?? false,
      schedulingMinimumHours: schedulerDoc?.schedulingMinimumHours ?? 0,
      allowChoiceOfInspectors: schedulerDoc?.allowChoiceOfInspectors ?? true,
      hidePricing: schedulerDoc?.hidePricing ?? false,
      showClientPricingDetails: schedulerDoc?.showClientPricingDetails ?? false,
      allowRequestNotes: schedulerDoc?.allowRequestNotes ?? false,
      requireConfirmation: schedulerDoc?.requireConfirmation ?? true,
      confirmationText: schedulerDoc?.confirmationText || '',
      googleAnalyticsNumber: schedulerDoc?.googleAnalyticsNumber || '',
      emailForCompleteBooking: schedulerDoc?.emailForCompleteBooking ?? false,
      emailForInProgressBooking: schedulerDoc?.emailForInProgressBooking ?? false,
      emailNotificationAddress: schedulerDoc?.emailNotificationAddress || '',
      smsForCompleteBooking: schedulerDoc?.smsForCompleteBooking ?? false,
      smsForInProgressBooking: schedulerDoc?.smsForInProgressBooking ?? false,
      smsNotificationNumber: schedulerDoc?.smsNotificationNumber || '',
    });
  } catch (error: any) {
    console.error('Online Scheduler GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load scheduler settings' },
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

    // Sanitize string fields
    const sanitizedConfirmationText = sanitizeString(body.confirmationText);
    const sanitizedGoogleAnalyticsNumber = sanitizeString(body.googleAnalyticsNumber);
    const sanitizedEmailNotificationAddress = sanitizeString(body.emailNotificationAddress);
    const sanitizedSmsNotificationNumber = sanitizeString(body.smsNotificationNumber);

    // Build update object
    const updateData: Record<string, any> = {
      onlineSchedulerEnabled: Boolean(body.onlineSchedulerEnabled),
      displayContactInfoBeforeDateSelection: Boolean(body.displayContactInfoBeforeDateSelection),
      schedulingMinimumHours: Number(body.schedulingMinimumHours) || 0,
      allowChoiceOfInspectors: Boolean(body.allowChoiceOfInspectors),
      hidePricing: Boolean(body.hidePricing),
      showClientPricingDetails: Boolean(body.showClientPricingDetails),
      allowRequestNotes: Boolean(body.allowRequestNotes),
      requireConfirmation: Boolean(body.requireConfirmation),
      confirmationText: sanitizedConfirmationText ?? '',
      googleAnalyticsNumber: sanitizedGoogleAnalyticsNumber,
      emailForCompleteBooking: Boolean(body.emailForCompleteBooking),
      emailForInProgressBooking: Boolean(body.emailForInProgressBooking),
      smsForCompleteBooking: Boolean(body.smsForCompleteBooking),
      smsForInProgressBooking: Boolean(body.smsForInProgressBooking),
      emailNotificationAddress: sanitizedEmailNotificationAddress,
      smsNotificationNumber: sanitizedSmsNotificationNumber,
    };

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Use findOneAndUpdate with upsert to create or update
    const updatedScheduler = await OnlineScheduler.findOneAndUpdate(
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

    if (!updatedScheduler) {
      return NextResponse.json(
        { error: 'Failed to update scheduler settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Scheduler settings updated successfully',
      onlineSchedulerEnabled: updatedScheduler.onlineSchedulerEnabled ?? false,
      displayContactInfoBeforeDateSelection: updatedScheduler.displayContactInfoBeforeDateSelection ?? false,
      schedulingMinimumHours: updatedScheduler.schedulingMinimumHours ?? 0,
      allowChoiceOfInspectors: updatedScheduler.allowChoiceOfInspectors ?? true,
      hidePricing: updatedScheduler.hidePricing ?? false,
      showClientPricingDetails: updatedScheduler.showClientPricingDetails ?? false,
      allowRequestNotes: updatedScheduler.allowRequestNotes ?? false,
      requireConfirmation: updatedScheduler.requireConfirmation ?? true,
      confirmationText: updatedScheduler.confirmationText || '',
      googleAnalyticsNumber: updatedScheduler.googleAnalyticsNumber || '',
      emailForCompleteBooking: updatedScheduler.emailForCompleteBooking ?? false,
      emailForInProgressBooking: updatedScheduler.emailForInProgressBooking ?? false,
      emailNotificationAddress: updatedScheduler.emailNotificationAddress || '',
      smsForCompleteBooking: updatedScheduler.smsForCompleteBooking ?? false,
      smsForInProgressBooking: updatedScheduler.smsForInProgressBooking ?? false,
      smsNotificationNumber: updatedScheduler.smsNotificationNumber || '',
    });
  } catch (error: any) {
    console.error('Online Scheduler PUT error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update scheduler settings' },
      { status: 500 }
    );
  }
}
