import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  sender: string; 
  content: string;
  group?: string; 
  recipient?: string; 
  createdAt: Date;
  fileAttachment?: {
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    path: string;
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
    filename: { type: String },
    originalName: { type: String },
    mimetype: { type: String },
    size: { type: Number },
    path: { type: String }
  },
  forwarded: { type: Boolean, default: false },
  seenBy: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  deliveredTo: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }]
});

export default mongoose.model<IMessage>('Message', MessageSchema);
