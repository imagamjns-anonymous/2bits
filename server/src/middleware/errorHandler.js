function errorHandler(error, _req, res, _next) {
  console.error(error);

  if (error.message === "Only image uploads are supported.") {
    return res.status(400).json({
      error: error.message,
    });
  }

  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: "Image size must be 5MB or smaller.",
    });
  }

  res.status(500).json({
    error: "Something went wrong.",
  });
}

module.exports = {
  errorHandler,
};
