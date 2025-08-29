import { issuanceWatcher } from '../lib/issuanceWatcher.js'

/**
 * Simple job runner for the issuance status watcher
 * Runs every 10 seconds to check submitted issuances
 */
export async function startIssuanceWatcherJob() {
  console.log('Starting issuance status watcher job...')
  
  // Run immediately on startup
  await issuanceWatcher.runWatcherJob()
  
  // Then run every 10 seconds
  setInterval(async () => {
    try {
      await issuanceWatcher.runWatcherJob()
    } catch (error) {
      console.error('Error in issuance watcher job:', error)
    }
  }, 10000) // 10 seconds
}

// Export for manual execution
export { issuanceWatcher }
