const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Create invoices directory if it doesn't exist
const invoicesDir = path.join(__dirname, '../public/invoices');
if (!fs.existsSync(invoicesDir)) {
  fs.mkdirSync(invoicesDir, { recursive: true });
}

/**
 * Generate PDF invoice similar to Sachin Foods format
 */
exports.generateInvoicePDF = async (invoice) => {
  return new Promise((resolve, reject) => {
    try {
      // Create PDF document
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      // File path
      const fileName = `invoice_${invoice.invoiceNumber}_${Date.now()}.pdf`;
      const filePath = path.join(invoicesDir, fileName);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Header - Company Info
      doc
        .fontSize(24)
        .fillColor('#d32f2f')
        .text('SACHIN FOODS', { align: 'center' })
        .moveDown(0.3);

      doc
        .fontSize(10)
        .fillColor('#000')
        .text('Manufacturing & Marketing of Chappathy, Appam', { align: 'center' })
        .text('Veesappam, Pathiri, Arippathiri & Bakery Items', { align: 'center' })
        .moveDown(0.2);

      doc
        .fontSize(9)
        .text('Kundara, Kollam, Ph: 9539387240, 9388808825, 8547828825', { align: 'center' })
        .moveDown(0.3);

      doc
        .fontSize(8)
        .text('Mobile: 9544938753', { align: 'center' })
        .text('GSTIN: 32BMDPB7722C1ZR', { align: 'center' })
        .moveDown(1);

      // Invoice Details
      const invoiceY = doc.y;
      doc
        .fontSize(10)
        .text(`Invoice No.: ${invoice.invoiceNumber}`, 50, invoiceY)
        .text(`Invoice Date: ${formatDate(invoice.invoiceDate)}`, 350, invoiceY);

      doc.moveDown(1.5);

      // Bill To and Ship To
      const billY = doc.y;
      
      // Bill To
      doc.fontSize(10).text('BILL TO', 50, billY);
      doc.fontSize(9)
        .text(invoice.customerName, 50, billY + 20)
        .text(`Mobile: ${invoice.customerPhone}`, 50, billY + 35);
      
      if (invoice.billingAddress && invoice.billingAddress.street) {
        doc.text(invoice.billingAddress.street, 50, billY + 50);
        if (invoice.billingAddress.city) {
          doc.text(
            `${invoice.billingAddress.city}, ${invoice.billingAddress.state} - ${invoice.billingAddress.pincode}`,
            50,
            billY + 65
          );
        }
      }

      // Ship To
      doc.fontSize(10).text('SHIP TO', 350, billY);
      doc.fontSize(9).text(invoice.customerName || 'Same as Billing', 350, billY + 20);
      
      if (invoice.shippingAddress && invoice.shippingAddress.street) {
        doc.text(invoice.shippingAddress.street, 350, billY + 35);
        if (invoice.shippingAddress.city) {
          doc.text(
            `${invoice.shippingAddress.city}, ${invoice.shippingAddress.state} - ${invoice.shippingAddress.pincode}`,
            350,
            billY + 50
          );
        }
      }

      doc.moveDown(6);

      // Delivery Date (if future order)
      if (invoice.deliveryDate) {
        doc
          .fontSize(10)
          .fillColor('#d32f2f')
          .text(`Delivery Date: ${formatDate(invoice.deliveryDate)}`, { align: 'center' })
          .fillColor('#000')
          .moveDown(1);
      }

      // Items Table
      const tableTop = doc.y;
      const itemsTableTop = tableTop;

      // Table Header
      doc
        .fontSize(9)
        .fillColor('#fff')
        .rect(50, itemsTableTop, 500, 20)
        .fill('#4a4a4a');

      doc
        .fillColor('#fff')
        .text('ITEMS', 55, itemsTableTop + 5)
        .text('QTY.', 300, itemsTableTop + 5)
        .text('RATE', 380, itemsTableTop + 5)
        .text('AMOUNT', 480, itemsTableTop + 5);

      // Table Rows
      let yPosition = itemsTableTop + 25;
      doc.fillColor('#000');

      invoice.items.forEach((item, i) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        const bgColor = i % 2 === 0 ? '#f5f5f5' : '#fff';
        doc.rect(50, yPosition - 5, 500, 20).fill(bgColor);

        doc
          .fillColor('#000')
          .fontSize(9)
          .text(item.name.toUpperCase(), 55, yPosition)
          .text(item.quantity, 300, yPosition)
          .text(`₹${item.rate}`, 380, yPosition)
          .text(`₹${item.amount}`, 480, yPosition);

        yPosition += 20;
      });

      doc.moveDown(2);

      // Totals Section
      const totalsY = yPosition + 20;
      const totalsX = 350;

      doc.fontSize(9);
      
      // Subtotal
      doc
        .text('SUBTOTAL', totalsX, totalsY)
        .text(`₹${invoice.subtotal.toFixed(2)}`, 480, totalsY, { width: 70, align: 'right' });

      let currentY = totalsY + 15;

      // Tax Details
      if (invoice.taxDetails && invoice.taxDetails.totalTax > 0) {
        if (invoice.taxDetails.cgst.amount > 0) {
          doc
            .text(`CGST (${invoice.taxDetails.cgst.rate}%)`, totalsX, currentY)
            .text(`₹${invoice.taxDetails.cgst.amount.toFixed(2)}`, 480, currentY, { width: 70, align: 'right' });
          currentY += 15;

          doc
            .text(`SGST (${invoice.taxDetails.sgst.rate}%)`, totalsX, currentY)
            .text(`₹${invoice.taxDetails.sgst.amount.toFixed(2)}`, 480, currentY, { width: 70, align: 'right' });
          currentY += 15;
        }

        if (invoice.taxDetails.igst.amount > 0) {
          doc
            .text(`IGST (${invoice.taxDetails.igst.rate}%)`, totalsX, currentY)
            .text(`₹${invoice.taxDetails.igst.amount.toFixed(2)}`, 480, currentY, { width: 70, align: 'right' });
          currentY += 15;
        }

        doc
          .text('TAXABLE AMOUNT', totalsX, currentY)
          .text(`₹${invoice.subtotal.toFixed(2)}`, 480, currentY, { width: 70, align: 'right' });
        currentY += 20;
      }

      // Total Amount
      doc
        .fontSize(11)
        .fillColor('#d32f2f')
        .text('TOTAL AMOUNT', totalsX, currentY)
        .text(`₹${invoice.totalAmount.toFixed(2)}`, 480, currentY, { width: 70, align: 'right' })
        .fillColor('#000');
      currentY += 20;

      // Payment Details
      doc.fontSize(9);
      doc
        .text('Received Amount', totalsX, currentY)
        .text(`₹${invoice.receivedAmount.toFixed(2)}`, 480, currentY, { width: 70, align: 'right' });
      currentY += 15;

      doc
        .text('Balance', totalsX, currentY)
        .text(`₹${invoice.balance.toFixed(2)}`, 480, currentY, { width: 70, align: 'right' });
      currentY += 20;

      // Amount in Words
      doc
        .fontSize(10)
        .text('Total Amount (in words)', 50, currentY)
        .fontSize(9)
        .fillColor('#d32f2f')
        .text(invoice.getAmountInWords(), 50, currentY + 15)
        .fillColor('#000');

      // Notes and Terms
      doc.moveDown(3);
      
      if (invoice.notes) {
        doc
          .fontSize(10)
          .text('NOTES', 50)
          .fontSize(9)
          .text(invoice.notes, 50);
        doc.moveDown(1);
      }

      doc
        .fontSize(10)
        .text('TERMS AND CONDITIONS', 50)
        .fontSize(8);
      
      invoice.termsAndConditions.forEach((term, i) => {
        doc.text(`${i + 1}. ${term}`, 50);
      });

      // Footer
      doc.moveDown(2);
      doc
        .fontSize(10)
        .fillColor('#d32f2f')
        .text(`${invoice.invoiceType.replace('_', ' ').toUpperCase()} ORIGINAL`, { align: 'center' })
        .fillColor('#000');

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        resolve({
          path: filePath,
          url: `/invoices/${fileName}`,
          fileName,
        });
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
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