const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
    },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'cash', 'card', 'upi', 'wallet'],
      default: 'razorpay',
    },
    paymentType: {
      type: String,
      enum: ['full', 'advance', 'remaining'],
      default: 'full',
    },
    razorpay_order_id: String,
    razorpay_payment_id: String,
    razorpay_signature: String,
    status: {
      type: String,
      enum: ['created', 'pending', 'authorized', 'captured', 'failed', 'refunded'],
      default: 'created',
    },
    transactionId: String,
    receipt: String,
    gatewayResponse: mongoose.Schema.Types.Mixed,
    errorCode: String,
    errorDescription: String,
    failureReason: String,
    isRefunded: {
      type: Boolean,
      default: false,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    refundId: String,
    refundedAt: Date,
    customerEmail: String,
    customerPhone: String,
    notes: {
      type: Map,
      of: String,
    },
    paidAt: Date,
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ order: 1 });
paymentSchema.index({ user: 1 });
paymentSchema.index({ razorpay_order_id: 1 });

paymentSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'captured' && !this.paidAt) {
    this.paidAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);