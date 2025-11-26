import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrderIdCounter extends Document {
  company: mongoose.Types.ObjectId;
  lastOrderId: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrderIdCounterSchema = new Schema<IOrderIdCounter>(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      unique: true,
      index: true,
    },
    lastOrderId: {
      type: Number,
      default: 1000,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const OrderIdCounter: Model<IOrderIdCounter> =
  mongoose.models.OrderIdCounter || mongoose.model<IOrderIdCounter>('OrderIdCounter', OrderIdCounterSchema);

export default OrderIdCounter;

