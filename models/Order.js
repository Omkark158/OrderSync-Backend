// ============================================
// 3. ORDER MODEL (models/Order.js) - UPDATED
// ============================================

const mongoose = require("mongoose");

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
    customerGSTIN: String, // NEW - For business customers
    
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
    
    // Billing and Shipping
    billingAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
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
    
    // Amounts
    subtotal: {
      type: Number,
      default: 0,
    },
    
    // GST Details - NEW
    gstDetails: {
      cgst: {
        rate: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
      },
      sgst: {
        rate: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
      },
      igst: {
        rate: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
      },
      totalTax: {
        type: Number,
        default: 0,
      },
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
    
    // Invoice Integration - NEW
    invoiceGenerated: {
      type: Boolean,
      default: false,
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    
    cancelledAt: Date,
    cancellationReason: String,
  },
  {
    timestamps: true,
  }
);

orderSchema.pre('save', async function (next) {
  // Generate order number
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD${Date.now()}${String(count + 1).padStart(4, '0')}`;
  }

  // Calculate subtotal
  this.subtotal = this.orderItems.reduce((sum, item) => sum + item.subtotal, 0);

  // Calculate GST
  const isKeralaCustomer = 
    this.deliveryAddress?.state?.toLowerCase() === 'kerala' ||
    this.billingAddress?.state?.toLowerCase() === 'kerala';
  
  const gstRate = 5; // 5% GST
  
  if (isKeralaCustomer) {
    // CGST + SGST
    const cgstRate = gstRate / 2;
    const sgstRate = gstRate / 2;
    this.gstDetails.cgst.rate = cgstRate;
    this.gstDetails.cgst.amount = (this.subtotal * cgstRate) / 100;
    this.gstDetails.sgst.rate = sgstRate;
    this.gstDetails.sgst.amount = (this.subtotal * sgstRate) / 100;
    this.gstDetails.igst.rate = 0;
    this.gstDetails.igst.amount = 0;
  } else {
    // IGST
    this.gstDetails.igst.rate = gstRate;
    this.gstDetails.igst.amount = (this.subtotal * gstRate) / 100;
    this.gstDetails.cgst.rate = 0;
    this.gstDetails.cgst.amount = 0;
    this.gstDetails.sgst.rate = 0;
    this.gstDetails.sgst.amount = 0;
  }
  
  this.gstDetails.totalTax = 
    this.gstDetails.cgst.amount + 
    this.gstDetails.sgst.amount + 
    this.gstDetails.igst.amount;

  // Calculate total amount including GST
  this.totalAmount = this.subtotal + this.gstDetails.totalTax;
  
  // Calculate remaining amount
  this.remainingAmount = this.totalAmount - this.advancePayment;

  // Update payment status
  if (this.advancePayment === 0) {
    this.paymentStatus = 'pending';
  } else if (this.advancePayment < this.totalAmount) {
    this.paymentStatus = 'partial';
  } else if (this.advancePayment >= this.totalAmount) {
    this.paymentStatus = 'completed';
  }

  // Check if future order
  if (this.orderDateTime > new Date()) {
    this.isFutureOrder = true;
  }

  next();
});

orderSchema.index({ user: 1, orderStatus: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customerPhone: 1 });
orderSchema.index({ orderDateTime: 1 });

module.exports = mongoose.model('Order', orderSchema);