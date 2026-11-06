import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  order: { type: Number, default: 0 },
});

export default mongoose.model('Category', categorySchema);
