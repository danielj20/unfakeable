module.exports = (req, res, _next) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ message: 'Route not found' });
  }

  res.status(404).send('<h1>404 – Page Not Found</h1>');
};
