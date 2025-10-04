const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Message = require('../models/Message');
const moment = require('moment');
const ApiError = require('../utils/ApiError');
const pino = require('pino');

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname'
    }
  }
});

/**
 * Calculates available slots for a given doctor on a specific date.
 * @param {string} doctorId
 * @param {Date} date - The date to check availability for
 * @returns {Promise<string[]>} - Array of available time slots (e.g., ['09:00', '09:30'])
 */
const getAvailableSlots = async (doctorId, date) => {
  try {
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      throw new ApiError(404, 'Doctor not found');
    }

    const targetDay = moment(date).format('dddd'); // e.g., 'Monday'
    const doctorAvailability = doctor.availability_slots.find(slot => slot.dayOfWeek === targetDay);

    if (!doctorAvailability) {
      return []; // Doctor not available on this day
    }

    const startMoment = moment(`${moment(date).format('YYYY-MM-DD')} ${doctorAvailability.startTime}`);
    const endMoment = moment(`${moment(date).format('YYYY-MM-DD')} ${doctorAvailability.endTime}`);
    const interval = doctorAvailability.interval || 30; // default 30 minutes

    const allPossibleSlots = [];
    let currentSlot = moment(startMoment);

    while (currentSlot.isBefore(endMoment)) {
      allPossibleSlots.push(currentSlot.format('HH:mm'));
      currentSlot.add(interval, 'minutes');
    }

    // Get existing appointments for the doctor on this date
    const existingAppointments = await Appointment.find({
      doctor_id: doctorId,
      slot_time: {
        $gte: moment(date).startOf('day').toDate(),
        $lt: moment(date).endOf('day').toDate()},
      status: { $in: ['pending', 'confirmed'] }, // Consider pending and confirmed as taken
    });

    const bookedSlots = existingAppointments.map(app => moment(app.slot_time).format('HH:mm'));

    const availableSlots = allPossibleSlots.filter(slot => !bookedSlots.includes(slot));

    return availableSlots;
  } catch (error) {
    logger.error('Error in getAvailableSlots:', error);
    throw error;
  }
};

/**
 * Creates a new appointment.
 * @param {object} payload - { doctor_id, patient_id, slot_time, source }
 * @returns {Promise<object>}
 */
const createAppointment = async (payload) => {
  try {
    const { doctor_id, patient_id, slot_time, source } = payload;

    // TODO: Add input validation for payload fields
    if (!doctor_id || !patient_id || !slot_time) {
      throw new ApiError(400, 'Missing required fields: doctor_id, patient_id, slot_time');
    }

    const doctor = await Doctor.findById(doctor_id);
    if (!doctor) throw new ApiError(404, 'Doctor not found');

    const patient = await Patient.findById(patient_id);
    if (!patient) throw new ApiError(404, 'Patient not found');

    const appointmentMoment = moment(slot_time);
    if (!appointmentMoment.isValid()) throw new ApiError(400, 'Invalid slot time');

    // Verify if the slot is actually available
    const availableSlots = await getAvailableSlots(doctor_id, appointmentMoment.toDate());
    if (!availableSlots.includes(appointmentMoment.format('HH:mm'))) {
      throw new ApiError(400, 'Selected slot is not available or already booked.');
    }

    const targetDay = appointmentMoment.format('dddd');
    const doctorAvailability = doctor.availability_slots.find(slot => slot.dayOfWeek === targetDay);
    // TODO: Handle case where doctorAvailability is not found but getAvailableSlots returned something (should not happen with current logic, but good practice)
    if (!doctorAvailability) {
      throw new ApiError(400, 'Doctor does not have availability configured for this day.');
    }
    const interval = doctorAvailability.interval || 30;
    const end_time = appointmentMoment.clone().add(interval, 'minutes').toDate();

    const newAppointment = await Appointment.create({
      doctor_id,
      patient_id,
      slot_time: appointmentMoment.toDate(),
      end_time,
      status: 'pending', // Per business rule, create tentative booking
      source});

    // TODO: Add logic to send confirmation message to patient and doctor, potentially via SMS or WhatsApp integration
    // Example:
    // await sendConfirmationMessage(patient.whatsapp_number, doctor.name, newAppointment.slot_time);
    // await sendConfirmationMessage(doctor.contact_info.whatsapp_number, patient.name, newAppointment.slot_time);


    return newAppointment;
  } catch (error) {
    logger.error('Error in createAppointment:', error);
    throw error;
  }
};

/**
 * Cancels an existing appointment.
 * @param {string} appointmentId
 * @returns {Promise<object>}
 */
const cancelAppointment = async (appointmentId) => {
  try {
    // TODO: Add validation to ensure the appointment is cancellable (e.g., not too close to the slot time)
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      throw new ApiError(404, 'Appointment not found');
    }

    // Example of a simple cancellation policy: cannot cancel within 24 hours of the appointment
    const now = moment();
    const appointmentTime = moment(appointment.slot_time);
    const hoursUntilAppointment = appointmentTime.diff(now, 'hours');

    if (hoursUntilAppointment < 24 && appointment.status !== 'cancelled') {
      throw new ApiError(400, 'Appointments cannot be cancelled within 24 hours of the slot time.');
    }


    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status: 'cancelled' },
      { new: true }
    );
    // The check for !appointment above covers this, but for clarity:
    // if (!updatedAppointment) {
    //   throw new ApiError(404, 'Appointment not found');
    // }

    // TODO: Add logic to notify patient and doctor about the cancellation
    // Example:
    // await sendCancellationNotification(appointment.patient_id, appointment.doctor_id);

    return updatedAppointment;
  } catch (error) {
    logger.error('Error in cancelAppointment:', error);
    throw error;
  }
};

/**
 * Retrieves the patient's appointment and message history.
 * @param {string} patientId
 * @returns {Promise<{ appointments: object[], messages: object[] }>}
 */
const getPatientHistory = async (patientId) => {
  try {
    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw new ApiError(404, 'Patient not found');
    }

    const appointments = await Appointment.find({ patient_id: patientId }).populate('doctor_id', 'name specialization').sort({ slot_time: -1 });
    // TODO: Ensure message retrieval logic is robust. Consider pagination for a large number of messages.
    const messages = await Message.find({ $or: [{ from: patient.whatsapp_number }, { to: patient.whatsapp_number }] }).sort({ timestamp: -1 }).limit(50); // Get recent 50 messages from/to the patient

    return { appointments, messages };
  } catch (error) {
    logger.error('Error in getPatientHistory:', error);
    throw error;
  }
};

module.exports = {
  getAvailableSlots,
  createAppointment,
  cancelAppointment,
  getPatientHistory};