import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITagRule {
  operation?: 'AND' | 'OR';
  ruleType: string;
  condition: 'Equal To' | 'Greater Than' | 'Less Than';
  count: number;
  within?: 'Last' | 'Next';
  days?: number;
}

export interface ITag extends Document {
  name: string;
  color: string;
  autoTagging: boolean;
  autoTagPerson?: 'Agent' | 'Client';
  rules: ITagRule[];
  removeTagOnRuleFail: boolean;
  company: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TagRuleSchema = new Schema<ITagRule>(
  {
    operation: {
      type: String,
      enum: ['AND', 'OR'],
    },
    ruleType: {
      type: String,
      required: true,
    },
    condition: {
      type: String,
      enum: ['Equal To', 'Greater Than', 'Less Than'],
      required: true,
    },
    count: {
      type: Number,
      required: true,
    },
    within: {
      type: String,
      enum: ['Last', 'Next'],
    },
    days: {
      type: Number,
    },
  },
  { _id: false }
);

const TagSchema = new Schema<ITag>(
  {
    name: {
      type: String,
      required: [true, 'Tag name is required'],
      trim: true,
    },
    color: {
      type: String,
      required: [true, 'Tag color is required'],
      default: '#3b82f6',
    },
    autoTagging: {
      type: Boolean,
      default: false,
    },
    autoTagPerson: {
      type: String,
      enum: ['Agent', 'Client'],
    },
    rules: {
      type: [TagRuleSchema],
      default: [],
    },
    removeTagOnRuleFail: {
      type: Boolean,
      default: false,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
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

TagSchema.index({ company: 1, name: 1 });

const Tag: Model<ITag> = mongoose.models.Tag || mongoose.model<ITag>('Tag', TagSchema);

export default Tag;

