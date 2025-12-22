// services/invoiceService.js - COMPLETE FIX WITH LINES AND RUPEE SYMBOL
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

exports.generateInvoicePDF = async (invoice) => {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 }
  });

  const fileName = `Invoice_${invoice.invoiceNumber}.pdf`;
  const pdfPath = path.join(__dirname, '..', 'public', 'invoices', fileName);
  const pdfUrl = `/invoices/${fileName}`;

  // Ensure directory exists
  const dir = path.dirname(pdfPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  const pageWidth = 595.28;
  const margin = 50;
  const contentWidth = pageWidth - (2 * margin);

  // ========================================
  // HEADER - COMPANY NAME
  // ========================================
  doc.fontSize(36)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text('SACHIN FOODS', margin, 60, { align: 'center', width: contentWidth });

  // Mobile and GSTIN with proper spacing
  doc.fontSize(11)
     .font('Helvetica')
     .text('Mobile: 9544938753', margin, 105, { align: 'center', width: contentWidth });
  
  doc.text('GSTIN: 32BMDPB7722C1ZR', margin, 120, { align: 'center', width: contentWidth });

  // Line after header
  doc.moveTo(margin, 140)
     .lineTo(pageWidth - margin, 140)
     .stroke();

  // ========================================
  // INVOICE INFO WITH GREY BACKGROUND
  // ========================================
  // Grey background box
  doc.rect(margin, 150, contentWidth, 25)
     .fillAndStroke('#f0f0f0', '#000000');

  doc.fontSize(11)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text(`Invoice No.: ${invoice.invoiceNumber}`, margin + 10, 157)
     .text(`Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-GB')}`, 
           350, 157);

  // ========================================
  // BILL TO / SHIP TO
  // ========================================
  doc.fontSize(11)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text('BILL TO', margin, 185);

  // Bill To Details
  let billY = 205;
  doc.fontSize(10)
     .font('Helvetica');

  doc.text(invoice.customerName || 'Cash Sale', margin, billY);
  billY += 15;

  doc.text(`Mobile: ${invoice.customerPhone}`, margin, billY);
  billY += 15;

  // Ship To (right side)
  doc.fontSize(11)
     .font('Helvetica-Bold')
     .text('SHIP TO', 310, 185);

  let shipY = 205;
  doc.fontSize(10)
     .font('Helvetica')
     .text(invoice.customerName || 'Cash Sale', 310, shipY);

  // ========================================
  // ITEMS TABLE HEADER
  // ========================================
  let tableY = Math.max(billY, shipY) + 25;

  // Top border of table
  doc.moveTo(margin, tableY - 5)
     .lineTo(pageWidth - margin, tableY - 5)
     .stroke();

  doc.fontSize(11)
     .font('Helvetica-Bold')
     .text('ITEMS', margin, tableY)
     .text('QTY.', 280, tableY)
     .text('RATE', 360, tableY)
     .text('AMOUNT', 460, tableY);

  tableY += 20;

  // Line under header
  doc.moveTo(margin, tableY - 5)
     .lineTo(pageWidth - margin, tableY - 5)
     .stroke();

  // ========================================
  // ITEMS ROWS (NO RUPEE SYMBOLS)
  // ========================================
  doc.fontSize(10)
     .font('Helvetica');

  invoice.items.forEach((item, index) => {
    doc.text(item.name.toUpperCase(), margin, tableY, { width: 220 });
    doc.text(`${item.quantity} PCS`, 280, tableY);
    doc.text(`${item.rate.toFixed(0)}`, 360, tableY);
    doc.text(`${item.amount.toFixed(0)}`, 460, tableY);

    tableY += 20;
    
    // Line after each item
    doc.moveTo(margin, tableY - 5)
       .lineTo(pageWidth - margin, tableY - 5)
       .stroke();
  });

  // ========================================
  // SUBTOTAL ROW (WITH QUANTITY AND RUPEE SYMBOL)
  // ========================================
  tableY += 5;
  
  doc.fontSize(11)
     .font('Helvetica-Bold')
     .text('SUBTOTAL', margin, tableY);
  
  // Total quantity
  const totalQty = invoice.items.reduce((sum, item) => sum + item.quantity, 0);
  doc.text(`${totalQty}`, 280, tableY);
  
  // Rupee symbol - Use Rs. for compatibility
  doc.text(`Rs. ${invoice.subtotal.toFixed(0)}`, 450, tableY);

  tableY += 25;

  // Bottom border of table
  doc.moveTo(margin, tableY - 5)
     .lineTo(pageWidth - margin, tableY - 5)
     .stroke();

  tableY += 15;

  // ========================================
  // NOTES SECTION
  // ========================================
  doc.fontSize(11)
     .font('Helvetica-Bold')
     .text('NOTES', margin, tableY);

  doc.fontSize(10)
     .font('Helvetica')
     .text(invoice.notes || "Don't waste food", margin, tableY + 18, { width: 240 });

  // ========================================
  // TERMS AND CONDITIONS
  // ========================================
  let termsY = tableY + 60;
  
  doc.fontSize(11)
     .font('Helvetica-Bold')
     .text('TERMS AND CONDITIONS', margin, termsY);

  termsY += 20;

  doc.fontSize(9)
     .font('Helvetica');

  const terms = invoice.termsAndConditions || [
    "Goods once sold will not be taken back or exchanged",
    "All disputes are subject to Kollam jurisdiction only"
  ];

  terms.forEach((term, idx) => {
    doc.text(`${idx + 1}. ${term}`, margin, termsY, { 
      width: 240,
      lineGap: 3
    });
    termsY += 20;
  });

  // ========================================
  // TOTALS SECTION (WITH RUPEE SYMBOLS)
  // ========================================
  let totalsY = tableY;

  doc.fontSize(10)
     .font('Helvetica-Bold');

  // Taxable Amount
  doc.text('TAXABLE AMOUNT', 340, totalsY);
  doc.text(`Rs. ${invoice.subtotal.toFixed(0)}`, 470, totalsY);
  totalsY += 20;

  // Total Amount
  doc.text('TOTAL AMOUNT', 340, totalsY);
  doc.text(`Rs. ${invoice.totalAmount.toFixed(0)}`, 470, totalsY);
  totalsY += 20;

  // Received Amount
  doc.text('Received Amount', 340, totalsY);
  doc.text(`Rs. ${invoice.receivedAmount.toFixed(0)}`, 470, totalsY);
  totalsY += 20;

  // Balance
  doc.text('Balance', 340, totalsY);
  doc.text(`Rs. ${invoice.balance.toFixed(0)}`, 470, totalsY);
  totalsY += 30;

  // Amount in Words
  doc.fontSize(10)
     .font('Helvetica-Bold')
     .text('Total Amount (in words)', 340, totalsY, { width: 205 });

  totalsY += 15;

  doc.fontSize(10)
     .font('Helvetica')
     .text(invoice.getAmountInWords(), 340, totalsY, { width: 205 });

  // ========================================
  // FOOTER
  // ========================================
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('BILL OF SUPPLY ORIGINAL', margin, doc.page.height - 70, { 
       align: 'center', 
       width: contentWidth 
     });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      resolve({ path: pdfPath, url: pdfUrl, fileName });
    });
    stream.on('error', reject);
  });
};