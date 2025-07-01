import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  sender: string; // userId
  content: string;
  group?: string; // groupId (for group chat)
  recipient?: string; // userId (for 1-to-1 chat)
  createdAt: Date;
}

const MessageSchema: Schema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  group: { type: Schema.Types.ObjectId, ref: 'Group' }, // optional
  recipient: { type: Schema.Types.ObjectId, ref: 'User' }, // optional
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IMessage>('Message', MessageSchema);
