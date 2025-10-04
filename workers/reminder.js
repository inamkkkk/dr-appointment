const { Worker } = require('bullmq');
const { translateText } = require('../src/services/llmService');
const { sendMessage } = require('../src/services/whatsappService');
const Appointment = require('../src/models/Appointment');
const Patient = require('../src/models/Patient');
const Doctor = require('../src/models/Doctor');
const moment = require('moment');
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

const connection = {
  host: process.env.QUEUE_REDIS_HOST || 'localhost',
  port: parseInt(process.env.QUEUE_REDIS_PORT || '6379', 10)};

const reminderWorker = new Worker(
  'reminderQueue',
  async (job) => {
    const { appointmentId, reminderType } = job.data;
    logger.info(`Processing reminder job for appointment: ${appointmentId}, type: ${reminderType}`);

    try {
      const appointment = await Appointment.findById(appointmentId).populate('patient_id').populate('doctor_id');

      if (!appointment || appointment.status !== 'confirmed') {
        logger.warn(`Appointment ${appointmentId} not found or not confirmed. Skipping reminder.`);
        return;
      }

      const patient = appointment.patient_id;
      const doctor = appointment.doctor_id;

      if (!patient || !doctor) {
        logger.error(`Patient or Doctor not found for appointment ${appointmentId}.`);
        return;
      }

      const appointmentTime = moment(appointment.slot_time).format('MMMM Do YYYY, h:mm a');
      let messageContent = '';
      // TODO: Get patient's preferred language from their profile or context
      const language = patient.preferred_language || 'en'; // Default to 'en' if not specified

      // Construct reminder message based on type
      switch (reminderType) {
        case '24_hour_reminder':
          // Default message
          messageContent = `Reminder: Your appointment with Dr. ${doctor.name} for ${doctor.specialization} is tomorrow at ${appointmentTime}.`;
          // Check if doctor has a specific template for this
          const doctorTemplate24Hour = doctor.templates.find(t => t.name === '24_hour_appointment_reminder' && t.language === language);
          if (doctorTemplate24Hour) {
            messageContent = doctorTemplate24Hour.content
              .replace('{doctorName}', doctor.name)
              .replace('{specialization}', doctor.specialization)
              .replace('{appointmentTime}', appointmentTime);
          }
          break;
        case '1_hour_reminder':
          // Default message
          messageContent = `Just a friendly reminder: Your appointment with Dr. ${doctor.name} is in 1 hour at ${appointmentTime}.`;
          // Check if doctor has a specific template for this
          const doctorTemplate1Hour = doctor.templates.find(t => t.name === '1_hour_appointment_reminder' && t.language === language);
          if (doctorTemplate1Hour) {
            messageContent = doctorTemplate1Hour.content
              .replace('{doctorName}', doctor.name)
              .replace('{appointmentTime}', appointmentTime);
          }
          break;
        case 'post_appointment_followup':
          // Default message
          messageContent = `How was your appointment with Dr. ${doctor.name} today? We appreciate your feedback.`;
          // Check if doctor has a specific template for this
          const doctorTemplateFollowup = doctor.templates.find(t => t.name === 'post_appointment_followup' && t.language === language);
          if (doctorTemplateFollowup) {
            messageContent = doctorTemplateFollowup.content
              .replace('{doctorName}', doctor.name);
          }
          break;
        default:
          logger.warn(`Unknown reminder type: ${reminderType} for appointment ${appointmentId}.`);
          return;
      }

      // Use LLM for multilingual polish if target language is not English
      if (language !== 'en') {
        try {
          messageContent = await translateText(messageContent, language);
        } catch (translationError) {
          logger.error(`Failed to translate reminder for appointment ${appointmentId} to ${language}:`, translationError);
          // Continue with the original message if translation fails
        }
      }

      // Send reminder via WhatsApp (primary) or other channels (SMS/Email - TODO)
      if (patient.reminder_prefs?.viaWhatsapp) {
        await sendMessage(patient.whatsapp_number, messageContent);
        logger.info(`Sent WhatsApp reminder to ${patient.whatsapp_number} for appointment ${appointmentId}.`);
      } else {
        logger.info(`WhatsApp reminders disabled for patient ${patient._id}. No message sent.`);
      }

      // TODO: Implement SMS/Email reminders if preferred
      if (patient.reminder_prefs?.viaSMS) {
        // smsService.sendSms(patient.phone, messageContent);
        logger.info(`SMS reminder logic for ${patient.phone} (Not implemented).`);
      }
      if (patient.reminder_prefs?.viaEmail) {
        // emailService.sendEmail(patient.email, 'Appointment Reminder', messageContent);
        logger.info(`Email reminder logic for ${patient.email} (Not implemented).`);
      }

    } catch (error) {
      logger.error(`Error in reminder worker for job ${job.id} for appointment ${appointmentId}:`, error);
      throw error; // Re-throw the error to allow BullMQ to handle retries
    }
  },
  { connection }
);

reminderWorker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed for appointment ${job.data.appointmentId}`);
});

reminderWorker.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed for appointment ${job.data.appointmentId}: ${err.message}`);
});

logger.info('Reminder Worker started.');

module.exports = reminderWorker;