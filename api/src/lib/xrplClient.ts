import xrpl from 'xrpl'

export async function withClient<T>(fn: (client: xrpl.Client) => Promise<T>): Promise<T> {
  const endpoint = process.env.XRPL_ENDPOINT || 'wss://s.altnet.rippletest.net:51233'
  const client = new xrpl.Client(endpoint)
  
  // Add connection timeout
  const CONNECT_TIMEOUT_MS = Number(process.env.XRPL_CONNECT_TIMEOUT_MS || 5000)
  const connectPromise = client.connect()
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('XRPL connection timeout')), CONNECT_TIMEOUT_MS)
  })
  
  await Promise.race([connectPromise, timeoutPromise])
  
  try {
    return await fn(client)
  } finally {
    await client.disconnect()
  }
}
