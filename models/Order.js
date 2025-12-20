// models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true, // ✅ unique index only once
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    customerName: {
      type: String,
      required: true,
    },

    customerPhone: {
      type: String,
      required: true,
      index: true,
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
      index: true,
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
      index: true,
    },

    orderStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled', 'denied'],
      default: 'pending',
      index: true,
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

// ================= PRE-SAVE HOOK =================
orderSchema.pre('save', async function () {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    const now = new Date();
    this.orderNumber = `SF${now.getFullYear()}${String(
      now.getMonth() + 1
    ).padStart(2, '0')}${String(count + 1).padStart(4, '0')}`;
  }

  if (this.orderItems?.length) {
    this.subtotal = this.orderItems.reduce((sum, i) => sum + i.subtotal, 0);
  }

  this.remainingAmount = this.totalAmount - this.advancePayment;

  if (this.advancePayment === 0) this.paymentStatus = 'pending';
  else if (this.advancePayment >= this.totalAmount) this.paymentStatus = 'completed';
  else this.paymentStatus = 'partial';

  this.isFutureOrder =
    (new Date(this.orderDateTime) - Date.now()) / (1000 * 60 * 60) > 24;

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
  }
});

// ================= VIRTUALS & METHODS =================
orderSchema.virtual('orderAge').get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

orderSchema.methods.canBeCancelled = function () {
  return ['pending', 'confirmed'].includes(this.orderStatus);
};

orderSchema.methods.canBeDenied = function () {
  return this.orderStatus === 'pending';
};

orderSchema.methods.canGenerateInvoice = function () {
  return this.orderStatus === 'confirmed' && !this.invoiceGenerated;
};

module.exports = mongoose.model('Order', orderSchema);
