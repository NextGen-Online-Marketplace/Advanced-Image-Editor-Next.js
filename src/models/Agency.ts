import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAgency extends Document {
  name: string;
  company: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AgencySchema = new Schema<IAgency>(
  {
    name: {
      type: String,
      required: [true, 'Agency name is required'],
      trim: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

AgencySchema.index({ company: 1 });
AgencySchema.index({ name: 1 });

const Agency: Model<IAgency> = mongoose.models.Agency || mongoose.model<IAgency>('Agency', AgencySchema);

export default Agency;

