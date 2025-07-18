import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  sender: string; 
  content: string;
  group?: string; 
  recipient?: string; 
  createdAt: Date;
  fileAttachment?: {
    url: string; // ImageKit URL
    name: string;
    type: string;
    size: number;
  };
  forwarded?: boolean;
  seenBy: string[]; // Array of user IDs who have seen the message
  deliveredTo: string[]; // Array of user IDs who have received the message
}

const MessageSchema: Schema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  group: { type: Schema.Types.ObjectId, ref: 'Group' }, // optional
  recipient: { type: Schema.Types.ObjectId, ref: 'User' }, // optional
  createdAt: { type: Date, default: Date.now },
  fileAttachment: {
    url: { type: String }, // ImageKit URL
    name: { type: String },
    type: { type: String },
    size: { type: Number }
  },
  forwarded: { type: Boolean, default: false },
  seenBy: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  deliveredTo: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }]
});

export default mongoose.model<IMessage>('Message', MessageSchema);
