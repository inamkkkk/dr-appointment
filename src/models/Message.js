const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation_id: {
    type: String, // Unique ID for a conversation, e.g., WhatsApp chat ID
    required: true,
    index: true,
  },
  from: {
    type: String, // Sender ID (e.g., patient's WhatsApp number)
    required: true,
  },
  to: {
    type: String, // Receiver ID (e.g., bot's WhatsApp number or doctor's WhatsApp number)
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  attachments: [
    {
      type: String, // URL or ID of the attachment (e.g., image, document)
      mimeType: String,
      filename: String,
    },
  ],
  timestamp: {
    type: Date,
    required: true,
  },
  processed_intent: {
    type: String, // Intent identified by the Intent Router
    // Example: 'booking', 'cancel', 'availability', 'greeting', 'medical_advice'
  },
  used_llm: {
    type: Boolean, // Whether LLM was used to generate a reply for this message
    default: false,
  },
  direction: {
    type: String,
    enum: ['incoming', 'outgoing'],
    required: true,
  },
},
{ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
