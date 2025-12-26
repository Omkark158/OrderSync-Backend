// models/Order.js - FIXED (No Duplicate Indexes)
const mongoose = require('mongoose');
const Counter = require('./Counter');

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      // ✅ REMOVED: index: true (using schema.index() instead)
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      // ✅ REMOVED: index: true
    },

    customerName: {
      type: String,
      required: true,
    },

    customerPhone: {
      type: String,
      required: true,
      // ✅ REMOVED: index: true
    },

    customerEmail: String,
    customerGSTIN: String,

    orderItems: [
      {
        menuItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Menu',
          required: true,
        },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },
        subtotal: { type: Number, required: true },
      },
    ],

    deliveryAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },

    orderDateTime: {
      type: Date,
      required: true,
      // ✅ REMOVED: index: true
    },

    isFutureOrder: { type: Boolean, default: false },

    subtotal: { type: Number, default: 0 },

    gstDetails: {
      isTaxable: { type: Boolean, default: false },
      cgst: { rate: Number, amount: Number },
      sgst: { rate: Number, amount: Number },
      igst: { rate: Number, amount: Number },
      totalTax: { type: Number, default: 0 },
    },

    totalAmount: { type: Number, required: true },
    advancePayment: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },

    paymentMethod: {
      type: String,
      enum: ['cash', 'online', 'upi', 'card'],
      default: 'cash',
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'completed', 'failed', 'refunded'],
      default: 'pending',
      // ✅ REMOVED: index: true
    },

    // Razorpay Payment Tracking
    paymentTransactions: [{
      razorpayOrderId: String,
      razorpayPaymentId: String,
      razorpaySignature: String,
      amount: Number,
      paymentType: { 
        type: String, 
        enum: ['advance', 'full', 'remaining'] 
      },
      status: {
        type: String,
        enum: ['success', 'failed', 'pending'],
        default: 'pending'
      },
      timestamp: { type: Date, default: Date.now },
      smsNotificationSent: { type: Boolean, default: false },
      failureReason: String
    }],

    orderStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled', 'denied'],
      default: 'pending',
      // ✅ REMOVED: index: true
    },

    specialInstructions: String,

    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    invoiceGenerated: { type: Boolean, default: false },

    confirmedAt: Date,
    preparingAt: Date,
    readyAt: Date,
    deliveredAt: Date,
    actualDeliveryTime: Date,

    deniedAt: Date,
    denialReason: String,
    deniedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    cancelledAt: Date,
    cancellationReason: String,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    notes: String,
    adminNotes: String,

    smsNotifications: {
      adminNotified: { type: Boolean, default: false },
      customerConfirmed: { type: Boolean, default: false },
      customerDenied: { type: Boolean, default: false },
      invoiceSent: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// ================= INDEXES (Consolidated) =================
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, orderDateTime: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ customerPhone: 1 });

// ================= STATIC METHOD =================
orderSchema.statics.getNextOrderNumber = async function() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const counterId = `order-${year}${month}`;

  try {
    const counter = await Counter.findByIdAndUpdate(
      counterId,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const orderNumber = `SF${year}${month}${String(counter.seq).padStart(4, '0')}`;
    console.log(`✅ Generated order number: ${orderNumber}`);
    return orderNumber;
  } catch (error) {
    console.error('❌ Error generating order number:', error);
    const fallbackNumber = `SF${year}${month}${Date.now().toString().slice(-6)}`;
    console.log(`⚠️ Using fallback order number: ${fallbackNumber}`);
    return fallbackNumber;
  }
};

// ================= PRE-SAVE HOOK =================
orderSchema.pre('save', async function() {
  if (this.isNew && !this.orderNumber) {
    this.orderNumber = await this.constructor.getNextOrderNumber();
  }

  if (this.orderItems?.length) {
    this.subtotal = this.orderItems.reduce((sum, i) => sum + i.subtotal, 0);
  }

  this.remainingAmount = this.totalAmount - (this.advancePayment || 0);

  if (!this.advancePayment || this.advancePayment === 0) {
    this.paymentStatus = 'pending';
  } else if (this.advancePayment >= this.totalAmount) {
    this.paymentStatus = 'completed';
    this.advancePayment = this.totalAmount;
    this.remainingAmount = 0;
  } else {
    this.paymentStatus = 'partial';
  }

  const hoursDiff = (new Date(this.orderDateTime) - Date.now()) / (1000 * 60 * 60);
  this.isFutureOrder = hoursDiff > 24;

  if (this.isModified('orderStatus')) {
    const now = Date.now();
    if (this.orderStatus === 'confirmed' && !this.confirmedAt) this.confirmedAt = now;
    if (this.orderStatus === 'preparing' && !this.preparingAt) this.preparingAt = now;
    if (this.orderStatus === 'ready' && !this.readyAt) this.readyAt = now;
    if (this.orderStatus === 'delivered' && !this.deliveredAt) {
      this.deliveredAt = now;
      this.actualDeliveryTime = now;
    }
    if (this.orderStatus === 'denied' && !this.deniedAt) this.deniedAt = now;
    if (this.orderStatus === 'cancelled' && !this.cancelledAt) this.cancelledAt = now;
  }
});

// ================= VIRTUALS =================
orderSchema.virtual('orderAge').get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// ================= METHODS =================
orderSchema.methods.canBeCancelled = function () {
  return ['pending', 'confirmed'].includes(this.orderStatus);
};

orderSchema.methods.canBeDenied = function () {
  return this.orderStatus === 'pending';
};

orderSchema.methods.canGenerateInvoice = function () {
  return this.orderStatus === 'confirmed' && !this.invoiceGenerated;
};

orderSchema.methods.addPaymentTransaction = function(transactionData) {
  if (!this.paymentTransactions) {
    this.paymentTransactions = [];
  }
  
  this.paymentTransactions.push(transactionData);
  
  if (transactionData.status === 'success' && transactionData.amount) {
    this.advancePayment = (this.advancePayment || 0) + transactionData.amount;
    this.remainingAmount = this.totalAmount - this.advancePayment;
    
    if (this.advancePayment >= this.totalAmount) {
      this.paymentStatus = 'completed';
      this.advancePayment = this.totalAmount;
      this.remainingAmount = 0;
    } else if (this.advancePayment > 0) {
      this.paymentStatus = 'partial';
    }
  }
};

module.exports = mongoose.model('Order', orderSchema);