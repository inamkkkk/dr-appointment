const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  doctor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
  },
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  slot_time: {
    type: Date,
    required: true,
  },
  end_time: {
    type: Date, // Automatically calculated based on doctor's slot interval
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
    default: 'pending',
  },
  source: {
    type: String,
    enum: ['whatsapp', 'web', 'admin'],
    default: 'whatsapp',
  },
  notes: {
    type: String,
    trim: true,
  },
},
{ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Add a compound unique index to prevent double bookings for a doctor at a specific time
appointmentSchema.index({ doctor_id: 1, slot_time: 1 }, { unique: true });

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
