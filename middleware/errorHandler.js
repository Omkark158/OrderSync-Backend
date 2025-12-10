const errorHandler = (err, req, res, next) => {
  let error = err; // FIXED

  console.error("Error:", err);

  if (err.name === "CastError") {
    error = {
      statusCode: 404,
      message: "Resource not found",
    };
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = {
      statusCode: 400,
      message: `${field} already exists`,
    };
  }

  if (err.name === "ValidationError") {
    error = {
      statusCode: 400,
      message: Object.values(err.errors)
        .map((v) => v.message)
        .join(", "),
    };
  }

  if (err.name === "JsonWebTokenError") {
    error = {
      statusCode: 401,
      message: "Invalid token",
    };
  }

  if (err.name === "TokenExpiredError") {
    error = {
      statusCode: 401,
      message: "Token expired",
    };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Server error",
    ...(process.env.NODE_ENV === "development" && { error: err, stack: err.stack }),
  });
};

module.exports = errorHandler;
