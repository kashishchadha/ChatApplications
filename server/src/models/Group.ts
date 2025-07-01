import mongoose, { Schema, Document } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  members: string[]; // array of userIds
}

const GroupSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

export default mongoose.model<IGroup>('Group', GroupSchema);
