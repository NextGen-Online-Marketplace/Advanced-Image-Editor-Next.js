import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITask extends Document {
  inspectionId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  taskType: 'Confirm' | 'Inquiry' | 'Networking' | 'Scheduling' | 'Other';
  assignedTo: mongoose.Types.ObjectId;
  priority: 'Low' | 'Normal' | 'High';
  dueDate: Date;
  title: string;
  description?: string;
  status: 'On Hold' | 'In Progress' | 'Complete';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    inspectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inspection',
      required: [true, 'Inspection ID is required'],
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
      index: true,
    },
    taskType: {
      type: String,
      enum: ['Confirm', 'Inquiry', 'Networking', 'Scheduling', 'Other'],
      required: [true, 'Task type is required'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned user is required'],
    },
    priority: {
      type: String,
      enum: ['Low', 'Normal', 'High'],
      default: 'Normal',
      required: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['On Hold', 'In Progress', 'Complete'],
      default: 'On Hold',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

// Indexes for efficient queries
TaskSchema.index({ inspectionId: 1, companyId: 1 });
TaskSchema.index({ assignedTo: 1, status: 1 });
TaskSchema.index({ dueDate: 1 });

export const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);

export default Task;

