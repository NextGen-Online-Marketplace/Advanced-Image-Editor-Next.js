import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEvent extends Document {
  inspectionId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  inspector?: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    inspectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inspection',
      required: [true, 'Inspection ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    inspector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

// Index for efficient queries
EventSchema.index({ inspectionId: 1, startDate: 1 });

export const Event: Model<IEvent> =
  mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);

export default Event;

