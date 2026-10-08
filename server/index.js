const fs = require('fs')
const path = require('path')

// Load .env before anything reads the environment. Variables already set in the shell win over the file.
const envFile = path.join(__dirname, '..', '.env')
if (fs.existsSync(envFile)) process.loadEnvFile(envFile)

const express = require('express')
const testCasesRouter = require('./routes/testCases')
const testSuitesRouter = require('./routes/test-suites')
const bugsRouter = require('./routes/bugs')
const testRunsRouter = require('./routes/test-runs')
const dashboardRouter = require('./routes/dashboard')
const reportsRouter = require('./routes/reports')
const { handleRequestError } = require('./error-handler')

const app = express()
const PORT = process.env.SERVER_PORT || 3001

app.use(express.json())

app.get('/api/hello', (req, res) => {
  res.json({ success: true, data: { message: 'Hello from the Express server!' }, error: null })
})

app.use('/api/test-cases', testCasesRouter)
app.use('/api/test-suites', testSuitesRouter)
app.use('/api/bugs', bugsRouter)
app.use('/api/test-runs', testRunsRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/reports', reportsRouter)

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, data: null, error: 'API route not found' })
})

const clientDist = path.join(__dirname, '..', 'client', 'dist')
app.use(express.static(clientDist))
app.use((req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

// Must be registered last, after every route and middleware.
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
