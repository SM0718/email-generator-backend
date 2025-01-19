import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
  structure: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true}
}, {
  timestamps: true
});

export const Template = mongoose.model('Event', templateSchema);
