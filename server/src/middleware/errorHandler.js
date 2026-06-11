export function notFoundHandler(req, res, _next) {
  res.status(404).json({
    ok: false,
    code: "NOT_FOUND",
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";
  if (status >= 500) console.error(err);
  res.status(status).json({
    ok: false,
    code,
    message: err.message || "Something went wrong.",
  });
}
