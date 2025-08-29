// Simple test script for the issuance watcher
import { issuanceWatcher } from './src/lib/issuanceWatcher.js'

async function testWatcher() {
  console.log('Testing issuance watcher...')
  
  try {
    // Run the watcher job
    await issuanceWatcher.runWatcherJob()
    console.log('Watcher job completed successfully')
  } catch (error) {
    console.error('Error running watcher job:', error)
  }
}

testWatcher()
