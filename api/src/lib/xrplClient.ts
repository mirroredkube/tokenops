import xrpl from 'xrpl'

export async function withClient<T>(fn: (client: xrpl.Client) => Promise<T>): Promise<T> {
  const endpoint = process.env.XRPL_ENDPOINT || 'wss://s.altnet.rippletest.net:51233'
  const client = new xrpl.Client(endpoint)
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.disconnect()
  }
}
