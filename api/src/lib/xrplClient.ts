import xrpl from 'xrpl'

export async function withClient<T>(fn: (client: xrpl.Client) => Promise<T>): Promise<T> {
  const endpoint = process.env.XRPL_ENDPOINT || 'wss://s.altnet.rippletest.net:51233'
  const client = new xrpl.Client(endpoint)
  
  // Add connection timeout with logging
  const CONNECT_TIMEOUT_MS = Number(process.env.XRPL_CONNECT_TIMEOUT_MS || 3000) // Shorter timeout
  console.log(`[XRPL] Attempting to connect to ${endpoint} with ${CONNECT_TIMEOUT_MS}ms timeout`)
  
  const connectPromise = client.connect()
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      console.log(`[XRPL] Connection timeout after ${CONNECT_TIMEOUT_MS}ms`)
      reject(new Error('XRPL connection timeout'))
    }, CONNECT_TIMEOUT_MS)
  })
  
  try {
    await Promise.race([connectPromise, timeoutPromise])
    console.log('[XRPL] Connected successfully')
  } catch (error) {
    console.log(`[XRPL] Connection failed: ${error}`)
    throw error
  }
  
  try {
    return await fn(client)
  } finally {
    try {
      await client.disconnect()
      console.log('[XRPL] Disconnected')
    } catch (e) {
      console.log(`[XRPL] Disconnect error: ${e}`)
    }
  }
}
