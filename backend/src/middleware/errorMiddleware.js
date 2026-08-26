export default function errorHandler(err, req, res, next) {
  console.error("Backend Error:", err);
  const status = err.status || 500;
  let message = err.message || "Internal server error";

  if (err.code === 'ECONNREFUSED' || (err.message && err.message.includes('ECONNREFUSED'))) {
    message = "Database connection failed. Please ensure PostgreSQL service is running.";
  } else if (err.name === 'PrismaClientInitializationError') {
    message = "Database server is unreachable. Please verify PostgreSQL service status.";
  }

  res.status(status).json({
    success: false,
    message,
  });
}

