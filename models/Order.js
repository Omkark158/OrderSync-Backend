const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderNumber: {
      type: String,
      unique: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
    },
    customerPhone: {
      type: String,
      required: [true, 'Customer phone is required'],
      match: [/^[6-9]\d{9}$/, 'Invalid phone number'],
    },
    customerEmail: String,
    orderItems: [
      {
        menuItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Menu',
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Quantity must be at least 1'],
        },
        price: {
          type: Number,
          required: true,
        },
        subtotal: {
          type: Number,
          required: true,
        },
      },
    ],
    deliveryAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    orderDateTime: {
      type: Date,
      required: [true, 'Order date and time is required'],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    advancePayment: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingAmount: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['full', 'advance', 'cash', 'online'],
      default: 'full',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    orderStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
      default: 'pending',
    },
    specialInstructions: {
      type: String,
      maxlength: [500, 'Instructions cannot exceed 500 characters'],
    },
    isFutureOrder: {
      type: Boolean,
      default: false,
    },
    estimatedDeliveryTime: Date,
    actualDeliveryTime: Date,
    cancelledAt: Date,
    cancellationReason: String,
  },
  {
    timestamps: true,
  }
);

orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD${Date.now()}${String(count + 1).padStart(4, '0')}`;
  }

  this.remainingAmount = this.totalAmount - this.advancePayment;

  if (this.advancePayment === 0) {
    this.paymentStatus = 'pending';
  } else if (this.advancePayment < this.totalAmount) {
    this.paymentStatus = 'partial';
  } else if (this.advancePayment >= this.totalAmount) {
    this.paymentStatus = 'completed';
  }

  if (this.orderDateTime > new Date()) {
    this.isFutureOrder = true;
  }

  next();
});

orderSchema.index({ user: 1, orderStatus: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customerPhone: 1 });

module.exports = mongoose.model('Order', orderSchema);