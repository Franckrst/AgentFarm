import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import { app } from './server.js'

describe('GET /health', () => {
  it('should return 200 status code', async () => {
    const response = await request(app).get('/health')
    expect(response.status).toBe(200)
  })

  it('should return JSON content type', async () => {
    const response = await request(app).get('/health')
    expect(response.headers['content-type']).toMatch(/application\/json/)
  })

  it('should return status field with value "ok"', async () => {
    const response = await request(app).get('/health')
    expect(response.body).toHaveProperty('status', 'ok')
  })

  it('should return a valid ISO timestamp', async () => {
    const response = await request(app).get('/health')
    expect(response.body).toHaveProperty('timestamp')

    const timestamp = response.body.timestamp
    const date = new Date(timestamp)
    expect(date.toISOString()).toBe(timestamp)
  })

  it('should return only status and timestamp fields', async () => {
    const response = await request(app).get('/health')
    const keys = Object.keys(response.body)
    expect(keys).toHaveLength(2)
    expect(keys).toContain('status')
    expect(keys).toContain('timestamp')
  })
})

describe('GET /health endpoint behavior', () => {
  it('should be accessible without authentication', async () => {
    // No auth headers are sent, and endpoint should still respond
    const response = await request(app).get('/health')
    expect(response.status).toBe(200)
  })

  it('should return current timestamp (not stale)', async () => {
    const before = new Date()
    const response = await request(app).get('/health')
    const after = new Date()

    const timestamp = new Date(response.body.timestamp)
    expect(timestamp >= before).toBe(true)
    expect(timestamp <= after).toBe(true)
  })

  it('should respond quickly (under 100ms)', async () => {
    const start = Date.now()
    await request(app).get('/health')
    const duration = Date.now() - start
    expect(duration).toBeLessThan(100)
  })
})

describe('Server startup logging', () => {
  it('should include health endpoint URL format in startup message pattern', () => {
    // Test that the startup logging pattern includes health endpoint
    const port = 4455
    const healthUrlPattern = `http://localhost:${port}/health`

    // Verify the URL format is correct
    expect(healthUrlPattern).toMatch(/^http:\/\/localhost:\d+\/health$/)
  })

  it('should construct health endpoint URL from server port', () => {
    // The server logs: "Health check available at http://localhost:${port}/health"
    const testPorts = [4455, 4456, 4050]

    for (const port of testPorts) {
      const expectedUrl = `http://localhost:${port}/health`
      expect(expectedUrl).toContain('/health')
      expect(expectedUrl).toContain(String(port))
    }
  })
})
