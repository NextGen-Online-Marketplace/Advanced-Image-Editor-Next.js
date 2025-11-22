import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAgentTeam extends Document {
  name: string;
  agents: mongoose.Types.ObjectId[];
  company: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AgentTeamSchema = new Schema<IAgentTeam>(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
    },
    agents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
    }],
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

AgentTeamSchema.index({ company: 1 });
AgentTeamSchema.index({ name: 1 });
AgentTeamSchema.index({ agents: 1 });

const AgentTeam: Model<IAgentTeam> = mongoose.models.AgentTeam || mongoose.model<IAgentTeam>('AgentTeam', AgentTeamSchema);

export default AgentTeam;

