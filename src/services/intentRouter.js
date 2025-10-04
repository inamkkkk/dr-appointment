const pino = require('pino');
const { generateReply } = require('./llmService');

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
 * Stubs for fast local intent and entity extraction.
 * In a real-world scenario, this would integrate with NLP models like MiniLM, fastText, or tiny-bert.
 * @param {string} messageText
 * @returns {Promise<{ intent: string, entities: object, confidence: number }>}
 */
const getIntentAndEntities = async (messageText) => {
  // TODO: Implement actual intent and entity extraction using a local NLP model.
  // For now, this is a rule-based or LLM-fallback stub.
  let intent = 'unknown';
  let entities = {};
  let confidence = 0.5; // Placeholder confidence

  const lowerCaseMessage = messageText.toLowerCase();

  if (lowerCaseMessage.includes('hello') || lowerCaseMessage.includes('hi')) {
    intent = 'greeting';
    confidence = 0.9;
  } else if (lowerCaseMessage.includes('book appointment') || lowerCaseMessage.includes('schedule a visit')) {
    intent = 'booking';
    // Extract date, time, doctor if possible
    entities = { type: 'appointment', date: null, time: null, doctor: null };
    confidence = 0.8;
  } else if (lowerCaseMessage.includes('cancel appointment')) {
    intent = 'cancel_booking';
    entities = { appointmentId: null };
    confidence = 0.8;
  } else if (lowerCaseMessage.includes('availability') || lowerCaseMessage.includes('free slots')) {
    intent = 'check_availability';
    entities = { doctor: null, date: null };
    confidence = 0.8;
  } else if (lowerCaseMessage.includes('medical advice') || lowerCaseMessage.includes('symptoms') || lowerCaseMessage.includes('what should i do')) {
    intent = 'medical_advice';
    confidence = 0.95;
  } else if (lowerCaseMessage.includes('history') || lowerCaseMessage.includes('past appointments')) {
    intent = 'get_patient_history';
    confidence = 0.7;
  }
  // Fallback to LLM for ambiguous intents or if local model fails to classify with high confidence
  if (confidence < 0.7) {
    logger.info(`Low confidence for intent: ${intent} (${confidence}). Falling back to LLM for classification.`);
    // In a production system, you'd send a more structured prompt to LLM for classification
    // For this skeleton, we'll simulate a generic fallback or let LLM service handle direct reply.
    // A real LLM call here would be to classify, not to generate a reply.
    // For now, we'll keep the intent as 'unknown' if low confidence and let the main handler decide.
    // Alternatively, LLM could refine entities or suggest a better intent.
    // const llmClassification = await generateReply(`Classify the intent of: "${messageText}"`, { context: 'intent_classification' });
    // if (llmClassification && llmClassification.includes('booking')) intent = 'booking'; // Example
  }

  logger.info(`Intent identified: ${intent}, Entities: ${JSON.stringify(entities)}, Confidence: ${confidence}`);
  return { intent, entities, confidence };
};

module.exports = {
  getIntentAndEntities,
};
