// Express 4 recognizes an error handler by it having exactly four parameters, so `next` must stay in the
// signature even though it is only used for the headersSent case. Register this after every route.
// Express 4 does not forward a rejected promise from an async route handler to this function; wrap such a
// handler so rejections reach next(err), or the request hangs and Node's unhandled-rejection rule can stop the server.
// Keeps every failure inside the {success, data, error} shape instead of Express's HTML error page.
function handleRequestError(err, req, res, next) {
  // Once the response has started, only Express's default handler can safely close the connection.
  if (res.headersSent) return next(err)

  let status = err.status || err.statusCode || 500
  let message

  if (err.type === 'entity.parse.failed') {
    status = 400
    message = 'The request body is not valid JSON.'
  } else if (err.type === 'entity.too.large') {
    status = 413
    message = 'The request body is too large.'
  } else if (status === 404) {
    message = 'Not found.'
  } else if (status >= 400 && status < 500) {
    message = 'The request could not be processed.'
  } else {
    console.error(err)
    status = 500
    message = 'Something went wrong on the server. Try again.'
  }

  res.status(status).json({ success: false, data: null, error: message })
}

module.exports = { handleRequestError }
