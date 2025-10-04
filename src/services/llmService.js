const pino = require('pino');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname'
    }
  }
});

const genAI = new GoogleGenerativeAI(process.env.LLM_API_KEY);
const model = genAI.getGenerativeModel({ model: process.env.LLM_MODEL_NAME || 'gemini-pro' });

const MEDICAL_ADVICE_POLICY_RESPONSE = "I cannot provide medical advice. Please book an appointment with a doctor. I can help you with scheduling if you'd like.";

/**
 * Generates a reply using the LLM, enforcing safety policies.
 * @param {string} prompt - The user's message or a formulated query.
 * @param {object} [context={}] - Additional context for the LLM (e.g., recent conversation, user info).
 * @param {boolean} [isMedicalAdviceQuery=false] - Flag if the intent router identified medical advice query.
 * @returns {Promise<string>}
 */
const generateReply = async (prompt, context = {}, isMedicalAdviceQuery = false) => {
  // Enforce medical advice policy immediately if intent is medical_advice
  if (isMedicalAdviceQuery) {
    logger.warn('Medical advice query detected. Returning policy response.');
    return MEDICAL_ADVICE_POLICY_RESPONSE;
  }

  // TODO: Add more sophisticated prompt engineering with context
  const fullPrompt = `You are a helpful AI assistant for a doctor's office. Your goal is to assist patients with appointments and general information, but *never* provide medical advice. If asked for medical advice, gently redirect them to book an appointment. Provide concise and clear answers.

Context: ${JSON.stringify(context)}
User: ${prompt}
AI: `;

  try {
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    let text = response.text();

    // Post-processing to enforce medical advice policy, just in case LLM generates it.
    // This is a last resort check and should ideally be handled by prompt engineering/safety settings.
    if (text.toLowerCase().includes('medical advice') && !text.includes(MEDICAL_ADVICE_POLICY_RESPONSE)) {
      logger.warn('LLM generated potential medical advice. Overriding with policy response.');
      text = MEDICAL_ADVICE_POLICY_RESPONSE;
    }

    return text;
  } catch (error) {
    logger.error('Error generating LLM reply:', error);
    return 'I apologize, but I am currently unable to process your request. Please try again later.';
  }
};

/**
 * Summarizes a given text using the LLM.
 * @param {string} text - The text to summarize.
 * @returns {Promise<string>}
 */
const summarizeText = async (text) => {
  // TODO: Implement actual summarization logic.
  // This would typically involve a dedicated summarization prompt.
  const prompt = `Please provide a concise summary of the following conversation/text:

${text}

Summary:`;
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    logger.error('Error summarizing text with LLM:', error);
    return 'Unable to generate summary.';
  }
};

/**
 * Translates a given text to a target language using the LLM.
 * @param {string} text - The text to translate.
 * @param {string} targetLanguage - The target language (e.g., 'es', 'fr').
 * @returns {Promise<string>}
 */
const translateText = async (text, targetLanguage) => {
  // TODO: Implement actual translation logic.
  const prompt = `Translate the following text into ${targetLanguage}:

${text}

Translation:`;
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    logger.error('Error translating text with LLM:', error);
    return 'Unable to translate text.';
  }
};

module.exports = {
  generateReply,
  summarizeText,
  translateText,
};
