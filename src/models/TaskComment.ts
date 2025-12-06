import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITaskComment extends Document {
  taskId: mongoose.Types.ObjectId;
  content: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskCommentSchema = new Schema<ITaskComment>(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Task ID is required'],
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
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

// Index for efficient queries
TaskCommentSchema.index({ taskId: 1, createdAt: -1 });

export const TaskComment: Model<ITaskComment> =
  mongoose.models.TaskComment || mongoose.model<ITaskComment>('TaskComment', TaskCommentSchema);

export default TaskComment;

