// Simple request logger middleware
const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const ip = req.ip || req.connection.remoteAddress;

  // Log request
  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip}`);

  // Log response time
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    
    // Color code based on status
    let statusColor = '\x1b[32m'; // Green for 2xx
    if (status >= 400 && status < 500) statusColor = '\x1b[33m'; // Yellow for 4xx
    if (status >= 500) statusColor = '\x1b[31m'; // Red for 5xx
    
    console.log(
      `${statusColor}[${timestamp}] ${method} ${url} - Status: ${status} - ${duration}ms\x1b[0m`
    );
  });

  next();
};

module.exports = logger;