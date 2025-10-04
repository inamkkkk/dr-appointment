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
    // In a real-world scenario, you'd make a call to an LLM service to classify the intent and extract entities.
    // For this example, we'll simulate that by calling generateReply with a specific prompt.
    try {
      const llmResponse = await generateReply(`Analyze the following user message and return a JSON object with 'intent', 'entities', and 'confidence'.
        User message: "${messageText}"
        Example output format: {"intent": "some_intent", "entities": {"key": "value"}, "confidence": 0.9}
        Possible intents: greeting, booking, cancel_booking, check_availability, medical_advice, get_patient_history, unknown.
        For booking, extract 'date', 'time', 'doctor'. For cancel_booking, extract 'appointmentId'. For check_availability, extract 'doctor', 'date'.
        If you are unsure or the intent is not among the provided ones, use 'unknown' intent.
        `, { context: 'intent_classification' });

      const parsedResponse = JSON.parse(llmResponse);
      if (parsedResponse && parsedResponse.intent) {
        intent = parsedResponse.intent;
        entities = parsedResponse.entities || {};
        confidence = parsedResponse.confidence || 0.5;
        logger.info(`LLM classification: Intent: ${intent}, Entities: ${JSON.stringify(entities)}, Confidence: ${confidence}`);
      } else {
        logger.warn(`LLM failed to provide a valid intent classification for message: "${messageText}"`);
      }
    } catch (error) {
      logger.error(`Error during LLM intent classification: ${error.message}`);
      // If LLM classification fails, stick with the current best guess or 'unknown'
    }
  }

  logger.info(`Final Intent identified: ${intent}, Entities: ${JSON.stringify(entities)}, Confidence: ${confidence}`);
  return { intent, entities, confidence };
};

module.exports = {
  getIntentAndEntities};