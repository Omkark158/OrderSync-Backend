// models/Invoice.js - FINAL FIXED VERSION: Safe auto-increment invoice numbers
const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,  // Now required because we always generate it
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
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
    
    // Customer Details
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerEmail: String,
    customerGSTIN: String,
    
    // Addresses
    billingAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    
    // Invoice Items
    items: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        rate: { type: Number, required: true },
        amount: { type: Number, required: true },
      },
    ],
    
    // Amounts
    subtotal: { type: Number, required: true },
    
    // GST Breakdown
    taxDetails: {
      isTaxable: { type: Boolean, default: true },
      cgst: { rate: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      sgst: { rate: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      igst: { rate: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      totalTax: { type: Number, default: 0 },
    },
    
    totalAmount: { type: Number, required: true },
    
    // Payment Details
    receivedAmount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['paid', 'partial', 'unpaid'],
      default: 'unpaid',
    },
    
    payments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }],
    
    invoiceType: {
      type: String,
      enum: ['tax_invoice', 'bill_of_supply', 'cash_sale'],
      default: 'bill_of_supply',
    },
    
    notes: {
      type: String,
      default: "Don't waste food",
    },
    termsAndConditions: {
      type: [String],
      default: [
        "Goods once sold will not be taken back or exchanged",
        "All disputes are subject to Kollam jurisdiction only"
      ],
    },
    
    pdfUrl: String,
    pdfPath: String,
    
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'cancelled'],
      default: 'draft',
    },
    
    sentAt: Date,
    paidAt: Date,
    cancelledAt: Date,
    
    deliveryDate: { type: Date, required: true },
  },
  { timestamps: true }
);

// ==================== SAFE AUTO-INCREMENT INVOICE NUMBER ====================
invoiceSchema.pre('save', async function (next) {
  const invoice = this;

  // Only generate for new invoices
  if (!invoice.isNew) return next();

  try {
    // Atomically increment counter and get next number
    const counter = await mongoose.model('Counter').findOneAndUpdate(
      { _id: 'invoiceNumber' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }  // Create counter if doesn't exist
    );

    invoice.invoiceNumber = String(counter.seq);
    console.log('✅ Generated invoice number:', invoice.invoiceNumber);
  } catch (error) {
    console.error('❌ Failed to generate invoice number:', error);
    return next(error);
  }

  // Calculate balance
  invoice.balance = invoice.totalAmount - invoice.receivedAmount;

  // Update payment status
  if (invoice.receivedAmount === 0) {
    invoice.paymentStatus = 'unpaid';
  } else if (invoice.receivedAmount < invoice.totalAmount) {
    invoice.paymentStatus = 'partial';
  } else {
    invoice.paymentStatus = 'paid';
    if (!invoice.paidAt) invoice.paidAt = Date.now();
  }

  next();
});
// ===========================================================================

// Indexes
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ order: 1 });
invoiceSchema.index({ user: 1 });
invoiceSchema.index({ invoiceDate: -1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ paymentStatus: 1 });

// Amount in words method (unchanged)
invoiceSchema.methods.getAmountInWords = function () {
  const amount = Math.floor(this.totalAmount);
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (amount === 0) return 'Zero Rupees';

  let words = '';
  let num = amount;

  // Crores
  if (num >= 10000000) {
    words += convert(num / 10000000) + ' Crore ';
    num %= 10000000;
  }
  // Lakhs
  if (num >= 100000) {
    words += convert(num / 100000) + ' Lakh ';
    num %= 100000;
  }
  // Thousands
  if (num >= 1000) {
    words += convert(num / 1000) + ' Thousand ';
    num %= 1000;
  }
  // Hundreds
  if (num >= 100) {
    words += ones[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  // Tens & Ones
  if (num >= 20) {
    words += tens[Math.floor(num / 10)] + ' ';
    num %= 10;
  } else if (num >= 10) {
    words += teens[num - 10] + ' ';
    num = 0;
  }
  if (num > 0) words += ones[num] + ' ';

  return words.trim() + ' Rupees Only';

  function convert(n) {
    n = Math.floor(n);
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  }
};

module.exports = mongoose.model('Invoice', invoiceSchema);