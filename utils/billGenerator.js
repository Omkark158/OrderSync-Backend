const { formatCurrency, formatDateTime } = require('./helpers');

// Generate bill HTML
exports.generateBillHTML = (order) => {
  const itemsHTML = order.orderItems
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.price)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${formatCurrency(item.subtotal)}</td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Bill - ${order.orderNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .bill-container { max-width: 800px; margin: 0 auto; border: 2px solid #3B82F6; border-radius: 8px; padding: 30px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #3B82F6; margin: 0; }
        .header p { color: #6b7280; margin: 5px 0; }
        .bill-details { background: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
        .bill-details p { margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #3B82F6; color: white; padding: 10px; text-align: left; }
        .totals { text-align: right; margin-top: 20px; }
        .totals p { margin: 5px 0; font-size: 16px; }
        .grand-total { font-size: 20px; font-weight: bold; color: #3B82F6; border-top: 2px solid #3B82F6; padding-top: 10px; margin-top: 10px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="bill-container">
        <div class="header">
          <h1>OrderSync</h1>
          <p>Food Ordering System</p>
          <p>📞 +91 1234567890 | 📧 support@ordersync.com</p>
        </div>

        <div class="bill-details">
          <h3 style="margin-top: 0;">Bill Details</h3>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Customer Name:</strong> ${order.customerName}</p>
          <p><strong>Phone:</strong> ${order.customerPhone}</p>
          <p><strong>Order Date:</strong> ${formatDateTime(order.orderDateTime)}</p>
          <p><strong>Status:</strong> <span style="color: #10B981; font-weight: 600;">${order.orderStatus.toUpperCase()}</span></p>
        </div>

        <h3>Order Items</h3>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="totals">
          <p><strong>Subtotal:</strong> ${formatCurrency(order.totalAmount)}</p>
          ${
            order.advancePayment > 0
              ? `<p><strong>Advance Paid:</strong> <span style="color: #10B981;">${formatCurrency(order.advancePayment)}</span></p>`
              : ''
          }
          ${
            order.remainingAmount > 0
              ? `<p><strong>Remaining:</strong> <span style="color: #EF4444;">${formatCurrency(order.remainingAmount)}</span></p>`
              : ''
          }
          <div class="grand-total">
            <p><strong>Total Amount:</strong> ${formatCurrency(order.totalAmount)}</p>
          </div>
        </div>

        ${
          order.specialInstructions
            ? `
        <div style="background: #FEF3C7; padding: 15px; border-radius: 6px; margin-top: 20px;">
          <h4 style="margin-top: 0;">Special Instructions</h4>
          <p>${order.specialInstructions}</p>
        </div>
        `
            : ''
        }

        <div class="footer">
          <p>Thank you for your order!</p>
          <p>Visit us again at OrderSync</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Generate bill text (for SMS or simple output)
exports.generateBillText = (order) => {
  const items = order.orderItems
    .map((item) => `${item.name} x${item.quantity} - ${formatCurrency(item.subtotal)}`)
    .join('\n');

  return `
OrderSync Bill
-------------
Order: ${order.orderNumber}
Customer: ${order.customerName}
Phone: ${order.customerPhone}

Items:
${items}

Total: ${formatCurrency(order.totalAmount)}
${order.advancePayment > 0 ? `Paid: ${formatCurrency(order.advancePayment)}` : ''}
${order.remainingAmount > 0 ? `Due: ${formatCurrency(order.remainingAmount)}` : ''}

Thank you for ordering!
  `.trim();
};

// Generate bill object (for API response)
exports.generateBillData = (order) => {
  return {
    orderNumber: order.orderNumber,
    date: formatDateTime(order.createdAt),
    customer: {
      name: order.customerName,
      phone: order.customerPhone,
      email: order.customerEmail,
    },
    items: order.orderItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
    })),
    summary: {
      subtotal: order.totalAmount,
      advancePaid: order.advancePayment,
      remaining: order.remainingAmount,
      total: order.totalAmount,
    },
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
  };
};