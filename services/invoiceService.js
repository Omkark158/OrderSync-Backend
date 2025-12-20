// services/invoiceService.js - Exact Sachin Foods Format
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Create invoices directory if it doesn't exist
const invoicesDir = path.join(__dirname, '../public/invoices');
if (!fs.existsSync(invoicesDir)) {
  fs.mkdirSync(invoicesDir, { recursive: true });
}

/**
 * Generate PDF invoice - EXACT Sachin Foods Format
 */
exports.generateInvoicePDF = async (invoice) => {
  return new Promise((resolve, reject) => {
    try {
      // Create PDF document
      const doc = new PDFDocument({ 
        margin: 40,
        size: 'A4',
        bufferPages: true
      });

      // File path
      const fileName = `invoice_${invoice.invoiceNumber}_${Date.now()}.pdf`;
      const filePath = path.join(invoicesDir, fileName);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // ========================================
      // HEADER - Company Name
      // ========================================
      doc
        .fontSize(28)
        .fillColor('#000')
        .font('Helvetica-Bold')
        .text('SACHIN FOODS', { align: 'center' })
        .moveDown(0.5);

      // ========================================
      // Company Details (Mobile & GSTIN)
      // ========================================
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#000')
        .text('Mobile: 9544938753', { align: 'center' })
        .text('GSTIN: 32BMDPB7722C1ZR', { align: 'center' })
        .moveDown(1);

      // ========================================
      // Invoice Number and Date
      // ========================================
      const invoiceInfoY = doc.y;
      
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Invoice No.: ${invoice.invoiceNumber}`, 50, invoiceInfoY)
        .text(`Invoice Date: ${formatDate(invoice.invoiceDate)}`, 350, invoiceInfoY);

      doc.moveDown(2);

      // ========================================
      // BILL TO & SHIP TO
      // ========================================
      const customerY = doc.y;
      
      // BILL TO
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('BILL TO', 50, customerY);
      
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(invoice.customerName || 'Cash Sale', 50, customerY + 20)
        .text(`Mobile: ${invoice.customerPhone}`, 50, customerY + 35);
      
      if (invoice.billingAddress && invoice.billingAddress.street) {
        doc
          .fontSize(9)
          .text(invoice.billingAddress.street, 50, customerY + 50, { width: 200 });
        if (invoice.billingAddress.city) {
          doc.text(
            `${invoice.billingAddress.city}, ${invoice.billingAddress.state || ''} - ${invoice.billingAddress.pincode || ''}`,
            50,
            customerY + 65,
            { width: 200 }
          );
        }
      }

      // SHIP TO
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('SHIP TO', 350, customerY);
      
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(invoice.customerName || 'Cash Sale', 350, customerY + 20);
      
      if (invoice.shippingAddress && invoice.shippingAddress.street) {
        doc
          .fontSize(9)
          .text(invoice.shippingAddress.street, 350, customerY + 35, { width: 200 });
        if (invoice.shippingAddress.city) {
          doc.text(
            `${invoice.shippingAddress.city}, ${invoice.shippingAddress.state || ''}`,
            350,
            customerY + 50,
            { width: 200 }
          );
        }
      }

      doc.moveDown(6);

      // ========================================
      // ITEMS TABLE
      // ========================================
      const tableTop = doc.y;
      let currentY = tableTop;

      // Table Header - Black background
      doc
        .rect(50, currentY, 500, 25)
        .fillAndStroke('#000', '#000');

      doc
        .fontSize(10)
        .fillColor('#fff')
        .font('Helvetica-Bold')
        .text('ITEMS', 60, currentY + 8, { width: 220 })
        .text('QTY.', 280, currentY + 8, { width: 50 })
        .text('RATE', 350, currentY + 8, { width: 80 })
        .text('AMOUNT', 450, currentY + 8, { width: 90 });

      currentY += 25;

      // Table Rows - No background, just text
      doc.fillColor('#000').font('Helvetica');

      invoice.items.forEach((item, i) => {
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }

        doc
          .fontSize(10)
          .text(item.name.toUpperCase(), 60, currentY + 5, { width: 220 })
          .text(item.quantity.toString(), 280, currentY + 5, { width: 50 })
          .text(`₹ ${item.rate}`, 350, currentY + 5, { width: 80 })
          .text(`₹ ${item.amount}`, 450, currentY + 5, { width: 90 });

        currentY += 25;
      });

      // Bottom border of table
      doc
        .moveTo(50, currentY)
        .lineTo(550, currentY)
        .stroke('#000');

      doc.moveDown(2);
      currentY = doc.y;

      // ========================================
      // SUBTOTAL
      // ========================================
      currentY += 10;
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('SUBTOTAL', 350, currentY)
        .text(`₹ ${invoice.subtotal.toFixed(0)}`, 450, currentY, { width: 90, align: 'left' });

      currentY += 30;

      // ========================================
      // NOTES
      // ========================================
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('NOTES', 50, currentY);
      
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(invoice.notes || "Don't waste food", 50, currentY + 18);

      currentY += 60;

      // ========================================
      // TERMS AND CONDITIONS
      // ========================================
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('TERMS AND CONDITIONS', 50, currentY);
      
      currentY += 18;

      doc.fontSize(9).font('Helvetica');
      invoice.termsAndConditions.forEach((term, i) => {
        doc.text(`${i + 1}. ${term}`, 50, currentY);
        currentY += 15;
      });

      currentY += 20;

      // ========================================
      // FINANCIAL SUMMARY (Right Side)
      // ========================================
      let summaryY = doc.y - 120; // Position on right side
      const summaryX = 350;

      // Tax Details (if applicable)
      if (invoice.taxDetails && invoice.taxDetails.totalTax > 0) {
        if (invoice.taxDetails.cgst.amount > 0) {
          doc
            .fontSize(10)
            .font('Helvetica')
            .text(`CGST (${invoice.taxDetails.cgst.rate}%)`, summaryX, summaryY)
            .text(`₹ ${invoice.taxDetails.cgst.amount.toFixed(2)}`, 450, summaryY, { width: 90, align: 'left' });
          summaryY += 18;

          doc
            .text(`SGST (${invoice.taxDetails.sgst.rate}%)`, summaryX, summaryY)
            .text(`₹ ${invoice.taxDetails.sgst.amount.toFixed(2)}`, 450, summaryY, { width: 90, align: 'left' });
          summaryY += 18;
        }

        if (invoice.taxDetails.igst.amount > 0) {
          doc
            .text(`IGST (${invoice.taxDetails.igst.rate}%)`, summaryX, summaryY)
            .text(`₹ ${invoice.taxDetails.igst.amount.toFixed(2)}`, 450, summaryY, { width: 90, align: 'left' });
          summaryY += 18;
        }

        doc
          .font('Helvetica-Bold')
          .text('TAXABLE AMOUNT', summaryX, summaryY)
          .text(`₹ ${invoice.subtotal.toFixed(0)}`, 450, summaryY, { width: 90, align: 'left' });
        summaryY += 25;
      } else {
        // If no tax, show TAXABLE AMOUNT same as subtotal
        doc
          .font('Helvetica-Bold')
          .text('TAXABLE AMOUNT', summaryX, summaryY)
          .text(`₹ ${invoice.subtotal.toFixed(0)}`, 450, summaryY, { width: 90, align: 'left' });
        summaryY += 25;
      }

      // TOTAL AMOUNT
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('TOTAL AMOUNT', summaryX, summaryY)
        .text(`₹ ${invoice.totalAmount.toFixed(0)}`, 450, summaryY, { width: 90, align: 'left' });
      summaryY += 20;

      // Received Amount
      doc
        .fontSize(10)
        .font('Helvetica')
        .text('Received Amount', summaryX, summaryY)
        .text(`₹ ${invoice.receivedAmount.toFixed(0)}`, 450, summaryY, { width: 90, align: 'left' });
      summaryY += 18;

      // Balance
      doc
        .text('Balance', summaryX, summaryY)
        .text(`₹ ${invoice.balance.toFixed(0)}`, 450, summaryY, { width: 90, align: 'left' });

      // ========================================
      // AMOUNT IN WORDS
      // ========================================
      doc.moveDown(4);
      currentY = Math.max(doc.y, summaryY + 40);

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Total Amount (in words)', 50, currentY);
      
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(invoice.getAmountInWords(), 50, currentY + 18, { width: 500 });

      doc.moveDown(3);

      // ========================================
      // FOOTER - Invoice Type
      // ========================================
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#000')
        .text(
          invoice.invoiceType === 'tax_invoice' ? 'TAX INVOICE ORIGINAL' : 
          invoice.invoiceType === 'cash_sale' ? 'CASH SALE ORIGINAL' :
          'BILL OF SUPPLY ORIGINAL', 
          { align: 'center' }
        );

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        console.log('✅ PDF generated successfully');
        resolve({
          path: filePath,
          url: `/invoices/${fileName}`,
          fileName,
        });
      });

      stream.on('error', (err) => {
        console.error('❌ PDF stream error:', err);
        reject(err);
      });
    } catch (error) {
      console.error('❌ PDF generation error:', error);
      reject(error);
    }
  });
};

// Helper function to format date
function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}