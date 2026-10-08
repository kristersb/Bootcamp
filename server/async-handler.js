// Express 4 does not pass a rejected promise from an async route handler to the error handler, so an
// unwrapped async route that throws leaves the request hanging and can stop the whole server.
// Wrap every async route handler with this so rejections reach next(err).
function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

module.exports = { asyncHandler }
