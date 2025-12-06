/* eslint-disable no-console */
module.exports = (err, req, res, _next) => {
  const status = err.status || 500;
  console.error('Error handler caught:', err);

  if (req.originalUrl.startsWith('/api')) {
    return res.status(status).json({
      message: err.message || 'Something went wrong',
    });
  }

  res
    .status(status)
    .send('<h1>Something went wrong</h1><p>Please try again later.</p>');
};
