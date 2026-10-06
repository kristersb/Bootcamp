const express = require('express')
const path = require('path')
const testCasesRouter = require('./routes/testCases')
const testSuitesRouter = require('./routes/test-suites')
const bugsRouter = require('./routes/bugs')

const app = express()
const PORT = process.env.SERVER_PORT || 3001

app.use(express.json())

app.get('/api/hello', (req, res) => {
  res.json({ success: true, data: { message: 'Hello from the Express server!' }, error: null })
})

app.use('/api/test-cases', testCasesRouter)
app.use('/api/test-suites', testSuitesRouter)
app.use('/api/bugs', bugsRouter)

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, data: null, error: 'API route not found' })
})

const clientDist = path.join(__dirname, '..', 'client', 'dist')
app.use(express.static(clientDist))
app.use((req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

// Keeps every failure inside the {success, data, error} shape instead of Express's HTML error page.
function handleRequestError(err, req, res, next) {
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

app.use(handleRequestError)

const server = app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})

// Node rejects oversized or malformed requests before Express runs, so they never reach the handlers above.
// Answer them in the same JSON shape instead of an empty reply.
server.on('clientError', (err, socket) => {
  if (!socket.writable) return

  const tooLarge = err.code === 'HPE_HEADER_OVERFLOW'
  const status = tooLarge ? '431 Request Header Fields Too Large' : '400 Bad Request'
  const body = JSON.stringify({
    success: false,
    data: null,
    error: tooLarge ? 'The request is too large. Shorten the search or the address and try again.' : 'The request could not be read.',
  })

  socket.end(
    `HTTP/1.1 ${status}\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\n\r\n${body}`
  )
})
