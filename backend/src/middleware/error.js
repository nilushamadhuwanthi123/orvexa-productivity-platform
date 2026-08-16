import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';

export const notFoundHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  let error = err;

  if (err instanceof mongoose.Error.ValidationError) {
    error = ApiError.badRequest(
      'Validation failed',
      Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }))
    );
  } else if (err instanceof mongoose.Error.CastError) {
    error = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  } else if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    error = ApiError.conflict(`An account with that ${field} already exists`);
  } else if (!(err instanceof ApiError)) {
    error = new ApiError(err.statusCode || 500, err.message || 'Internal server error');
    error.isOperational = false;
  }

  if (!error.isOperational || error.statusCode >= 500) {
    console.error('[orvexa] Unhandled error:', err);
  }

  res.status(error.statusCode).json({
    success: false,
    error: {
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
      ...(env.isProd ? {} : { stack: err.stack }),
    },
  });
};
