// ============================================
// 6. INVOICE MODEL (models/Invoice.js) - COMPLETE
// ============================================
const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
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
    customerName: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      required: true,
    },
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
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        rate: {
          type: Number,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
      },
    ],
    
    // Amounts
    subtotal: {
      type: Number,
      required: true,
    },
    
    // GST Breakdown
    taxDetails: {
      isTaxable: {
        type: Boolean,
        default: true,
      },
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
    },
    
    // Payment Details
    receivedAmount: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'partial', 'unpaid'],
      default: 'unpaid',
    },
    
    // Payments linked to this invoice
    payments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    }],
    
    // Invoice Type
    invoiceType: {
      type: String,
      enum: ['tax_invoice', 'bill_of_supply', 'cash_sale'],
      default: 'bill_of_supply',
    },
    
    // Notes and Terms
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
    
    // PDF Storage
    pdfUrl: String,
    pdfPath: String,
    
    // Status
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'cancelled'],
      default: 'draft',
    },
    
    sentAt: Date,
    paidAt: Date,
    cancelledAt: Date,
    
    // Delivery Date
    deliveryDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook
invoiceSchema.pre('save', async function (next) {
  // Generate invoice number
  if (!this.invoiceNumber) {
    const count = await mongoose.model('Invoice').countDocuments();
    this.invoiceNumber = `${count + 1}`;
  }
  
  // Calculate balance
  this.balance = this.totalAmount - this.receivedAmount;
  
  // Update payment status
  if (this.receivedAmount === 0) {
    this.paymentStatus = 'unpaid';
  } else if (this.receivedAmount < this.totalAmount) {
    this.paymentStatus = 'partial';
  } else {
    this.paymentStatus = 'paid';
    if (!this.paidAt) {
      this.paidAt = Date.now();
    }
  }
  
  next();
});

// Indexes
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ order: 1 });
invoiceSchema.index({ user: 1 });
invoiceSchema.index({ invoiceDate: -1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ paymentStatus: 1 });

// Method to convert amount to words
invoiceSchema.methods.getAmountInWords = function() {
  const amount = Math.floor(this.totalAmount);
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  if (amount === 0) return 'Zero Rupees';
  
  let words = '';
  let num = amount;
  
  if (num >= 10000000) {
    const crores = Math.floor(num / 10000000);
    words += convertToWords(crores) + ' Crore ';
    num %= 10000000;
  }
  
  if (num >= 100000) {
    const lakhs = Math.floor(num / 100000);
    words += convertToWords(lakhs) + ' Lakh ';
    num %= 100000;
  }
  
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    words += convertToWords(thousands) + ' Thousand ';
    num %= 1000;
  }
  
  if (num >= 100) {
    const hundreds = Math.floor(num / 100);
    words += ones[hundreds] + ' Hundred ';
    num %= 100;
  }
  
  if (num >= 20) {
    words += tens[Math.floor(num / 10)] + ' ';
    num %= 10;
  } else if (num >= 10) {
    words += teens[num - 10] + ' ';
    num = 0;
  }
  
  if (num > 0) {
    words += ones[num] + ' ';
  }
  
  return words.trim() + ' Rupees';
  
  function convertToWords(n) {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    }
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertToWords(n % 100) : '');
  }
};

module.exports = mongoose.model('Invoice', invoiceSchema);