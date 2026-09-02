export default function errorHandler(err, req, res, next) {
  console.error("Backend Error:", err);
  let status = err.status || 500;
  let message = err.message || "Internal server error";
  let code = err.code;

  if (err.code === 'ECONNREFUSED' || (err.message && err.message.includes('ECONNREFUSED'))) {
    message = "Database connection failed. Please ensure PostgreSQL service is running.";
  } else if (err.name === 'PrismaClientInitializationError') {
    message = "Database server is unreachable. Please verify PostgreSQL service status.";
  } else if (err.code === 'P2003' || (err.message && err.message.includes('foreign key constraint'))) {
    status = 400;
    code = 'FOREIGN_KEY_VIOLATION';
    message = "Operation violates database relationship constraint. Related records (such as collection tasks or history) are protected.";
  } else if (err.code === 'P2002') {
    status = 409;
    code = 'UNIQUE_CONSTRAINT_VIOLATION';
    message = "A record with this unique identifier already exists.";
  }

  res.status(status).json({
    success: false,
    message,
    code,
  });
}


