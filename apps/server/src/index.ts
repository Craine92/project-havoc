import { createServer } from 'node:http'

const DEFAULT_PORT = 3000
const configuredPort = Number.parseInt(process.env.PORT ?? '', 10)
const port = Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : DEFAULT_PORT

const server = createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify({ status: 'ok' }))
    return
  }

  response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify({ error: 'not-found' }))
})

server.listen(port, '127.0.0.1', () => {
  console.info(`Project Havoc server listening on http://127.0.0.1:${port}`)
})
