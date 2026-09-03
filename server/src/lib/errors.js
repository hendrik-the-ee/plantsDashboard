export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export function notFound(message = 'Not found') {
  return new HttpError(404, message);
}

export function forbidden(message = 'Forbidden') {
  return new HttpError(403, message);
}

export function unauthorized(message = 'Unauthorized') {
  return new HttpError(401, message);
}

const PG_STATUS = {
  '23514': 400, // check_violation
  '23503': 400, // foreign_key_violation
  '23505': 409, // unique_violation
  '23502': 400, // not_null_violation
};

export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    const body = { error: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }

  const pgStatus = PG_STATUS[err.code];
  if (pgStatus) {
    return res.status(pgStatus).json({
      error: err.detail || err.message,
      code: err.code,
    });
  }

  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Internal error' : err.message });
}
