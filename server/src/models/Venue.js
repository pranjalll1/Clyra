import mongoose from 'mongoose';

export const VENUE_TYPES = ['auditorium', 'sports', 'hub', 'academic'];

const venueSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // e.g. VNU-SDMAUD-02
    name: { type: String, required: true, trim: true },
    location: { type: String, trim: true },
    type: { type: String, enum: VENUE_TYPES, required: true },
    capacity: { type: Number, required: true, min: 1 },
    // How many independent events the venue can host at once (e.g. 6 open-air theater clusters).
    // Slice 3's overlap check allows up to `units` concurrent events.
    units: { type: Number, default: 1, min: 1 },
    amenities: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Venue', venueSchema);
