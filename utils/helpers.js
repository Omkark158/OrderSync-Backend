// Format currency to Indian Rupees
exports.formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

// Format date
exports.formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Format date and time
exports.formatDateTime = (date) => {
  return new Date(date).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Generate random OTP
exports.generateOTP = (length = 6) => {
  return Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, '0');
};

// Calculate order total from items
exports.calculateOrderTotal = (orderItems) => {
  return orderItems.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);
};

// Validate phone number (Indian format)
exports.isValidPhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

// Validate email
exports.isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Generate unique order number
exports.generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `ORD${timestamp}${random}`;
};

// Calculate estimated delivery time
exports.calculateDeliveryTime = (orderDateTime, preparationTime = 30) => {
  const orderDate = new Date(orderDateTime);
  const deliveryTime = new Date(orderDate.getTime() + preparationTime * 60000);
  return deliveryTime;
};

// Sanitize user input
exports.sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

// Paginate results
exports.paginate = (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return { skip, limit: parseInt(limit) };
};

// Create pagination metadata
exports.createPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

// Generate random string
exports.generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Check if date is in future
exports.isFutureDate = (date) => {
  return new Date(date) > new Date();
};

// Check if date is in past
exports.isPastDate = (date) => {
  return new Date(date) < new Date();
};

// Get time difference in minutes
exports.getTimeDifferenceInMinutes = (date1, date2) => {
  const diff = Math.abs(new Date(date2) - new Date(date1));
  return Math.floor(diff / 60000);
};

// Format phone number for display
exports.formatPhoneNumber = (phone) => {
  if (phone.length === 10) {
    return phone.replace(/(\d{5})(\d{5})/, '$1 $2');
  }
  return phone;
};

// Capitalize first letter
exports.capitalizeFirst = (str) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Sleep/delay function
exports.sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};