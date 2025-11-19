import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOnlineScheduler extends Document {
  company: mongoose.Types.ObjectId;
  onlineSchedulerEnabled: boolean;
  displayContactInfoBeforeDateSelection: boolean;
  schedulingMinimumHours: number;
  allowChoiceOfInspectors: boolean;
  hidePricing: boolean;
  showClientPricingDetails: boolean;
  allowRequestNotes: boolean;
  requireConfirmation: boolean;
  confirmationText: string;
  googleAnalyticsNumber?: string;
  emailForCompleteBooking: boolean;
  emailForInProgressBooking: boolean;
  emailNotificationAddress?: string;
  smsForCompleteBooking: boolean;
  smsForInProgressBooking: boolean;
  smsNotificationNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OnlineSchedulerSchema = new Schema<IOnlineScheduler>(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company is required'],
      unique: true,
    },
    onlineSchedulerEnabled: {
      type: Boolean,
      default: false,
    },
    displayContactInfoBeforeDateSelection: {
      type: Boolean,
      default: false,
    },
    schedulingMinimumHours: {
      type: Number,
      default: 0,
    },
    allowChoiceOfInspectors: {
      type: Boolean,
      default: true,
    },
    hidePricing: {
      type: Boolean,
      default: false,
    },
    showClientPricingDetails: {
      type: Boolean,
      default: false,
    },
    allowRequestNotes: {
      type: Boolean,
      default: false,
    },
    requireConfirmation: {
      type: Boolean,
      default: true,
    },
    confirmationText: {
      type: String,
      default: '',
    },
    googleAnalyticsNumber: {
      type: String,
      trim: true,
    },
    emailForCompleteBooking: {
      type: Boolean,
      default: false,
    },
    emailForInProgressBooking: {
      type: Boolean,
      default: false,
    },
    emailNotificationAddress: {
      type: String,
      trim: true,
      lowercase: true,
    },
    smsForCompleteBooking: {
      type: Boolean,
      default: false,
    },
    smsForInProgressBooking: {
      type: Boolean,
      default: false,
    },
    smsNotificationNumber: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

export const OnlineScheduler: Model<IOnlineScheduler> =
  mongoose.models.OnlineScheduler || mongoose.model<IOnlineScheduler>('OnlineScheduler', OnlineSchedulerSchema);

export default OnlineScheduler;

