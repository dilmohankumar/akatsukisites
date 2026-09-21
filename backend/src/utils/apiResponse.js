export function ok(res, data, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, data, message });
}

export class ApiError extends Error {
  constructor(status, message, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}
