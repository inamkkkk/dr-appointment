const mongoose = require('mongoose');

const conversationSummarySchema = new mongoose.Schema({
  conversation_id: {
    type: String,
    required: true,
    unique: true,
    index: true},
  summary_text: {
    type: String,
    required: true},
  key_points: [
    { type: String }],
  embedding_ref: {
    type: String, // Reference to the embedding stored in the Vector Memory Hub
    // e.g., Qdrant point ID or Pinecone vector ID
  },
  last_updated: {
    type: Date,
    required: true,
    default: Date.now},
  // Optional: link to patient if known
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    sparse: true}},
{ timestamps: { createdAt: 'created_at', updatedAt: 'last_updated' } }
);

// TODO: Add any necessary Mongoose middleware (e.g., pre-save hooks) or custom methods here.
// For example, you might want to automatically update 'last_updated' or perform data validation before saving.

const ConversationSummary = mongoose.model('ConversationSummary', conversationSummarySchema);

module.exports = ConversationSummary;