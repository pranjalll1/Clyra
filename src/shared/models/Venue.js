import mongoose from 'mongoose';

export const VENUE_TYPES = ['auditorium', 'sports', 'hub', 'academic'];

const venueSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true }, // e.g. VNU-SDMAUD-02
    name: { type: String, required: true, trim: true },
    location: { type: String, trim: true },
    type: { type: String, enum: VENUE_TYPES, required: true },
    capacity: { type: Number, required: true, min: 1 },
    units: { type: Number, default: 1, min: 1 },
    amenities: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Venue || mongoose.model('Venue', venueSchema);
