import mongoose, { Schema, Document } from 'mongoose';

export interface CounterDocument extends Document {
  _id: string;
  sequence_value: number;
}

const counterSchema = new Schema<CounterDocument>({
  _id: {
    type: String,
    required: true
  },
  sequence_value: {
    type: Number,
    default: 100000
  }
});

export default mongoose.models.Counter || mongoose.model<CounterDocument>('Counter', counterSchema);
