#!/usr/bin/env tsx

/**
 * Script to enable RequireAuth on an XRPL issuer account
 * This sets the RequireAuth flag (0x00040000) on the account
 */

import { Client, AccountSet, AccountSetAsfFlags, Wallet } from 'xrpl'

async function enableRequireAuth() {
  console.log('🔧 Enabling RequireAuth on XRPL issuer account...\n')

  // Configuration
  const ISSUER_ADDRESS = 'rKKy7VfBFHbrA2v3pE2a1fKuAqnvcTvDDs' // LAKSHMI issuer
  const ISSUER_SECRET = process.env.ISSUER_SECRET || 'sEdVisvG932yiAyjDMpjucVnpu2s7Vf'
  const XRPL_SERVER = 'wss://s.altnet.rippletest.net:51233' // XRPL Testnet

  if (ISSUER_SECRET === 'YOUR_ISSUER_SECRET_HERE') {
    console.log('❌ Please set ISSUER_SECRET environment variable with the issuer account secret')
    console.log('   Example: export ISSUER_SECRET="sYourSecretKeyHere..."')
    return
  }

  try {
    // Connect to XRPL
    const client = new Client(XRPL_SERVER)
    await client.connect()
    console.log('✅ Connected to XRPL Testnet')

    // Get account info before
    const accountInfoBefore = await client.request({
      command: 'account_info',
      account: ISSUER_ADDRESS,
      ledger_index: 'validated'
    })

    console.log(`📊 Account: ${ISSUER_ADDRESS}`)
    console.log(`📊 Current Flags: ${accountInfoBefore.result.account_data.Flags}`)
    console.log(`📊 Current Flags (hex): 0x${accountInfoBefore.result.account_data.Flags?.toString(16)}`)

    // Check if RequireAuth is already enabled
    const hasRequireAuth = accountInfoBefore.result.account_data.Flags && 
      (accountInfoBefore.result.account_data.Flags & 0x00040000) !== 0

    if (hasRequireAuth) {
      console.log('✅ RequireAuth is already enabled on this account!')
      await client.disconnect()
      return
    }

    // Prepare AccountSet transaction
    const accountSet: AccountSet = {
      TransactionType: 'AccountSet',
      Account: ISSUER_ADDRESS,
      SetFlag: AccountSetAsfFlags.asfRequireAuth, // 0x00040000
    }

    // Get current sequence number
    const accountInfo = await client.request({
      command: 'account_info',
      account: ISSUER_ADDRESS,
      ledger_index: 'validated'
    })

    accountSet.Sequence = accountInfo.result.account_data.Sequence

    // Get current fee
    const feeResponse = await client.request({
      command: 'fee'
    })

    accountSet.Fee = feeResponse.result.drops.base_fee

    console.log('📝 Preparing AccountSet transaction...')
    console.log(`   SetFlag: ${AccountSetAsfFlags.asfRequireAuth} (0x00040000)`)
    console.log(`   Sequence: ${accountSet.Sequence}`)
    console.log(`   Fee: ${accountSet.Fee} drops`)

    // Sign the transaction
    const wallet = Wallet.fromSeed(ISSUER_SECRET)
    const signedTx = wallet.sign(accountSet)

    console.log('🔐 Transaction signed successfully')
    console.log(`📋 Transaction Hash: ${signedTx.hash}`)

    // Submit the transaction
    console.log('📡 Submitting transaction to XRPL...')
    const submitResponse = await client.submit(accountSet, { wallet })

    if (submitResponse.result.engine_result === 'tesSUCCESS') {
      console.log('✅ Transaction submitted successfully!')
      console.log(`📋 Engine Result: ${submitResponse.result.engine_result}`)
      console.log(`📋 Transaction Hash: ${submitResponse.result.tx_json.hash}`)

      // Wait for validation
      console.log('⏳ Waiting for transaction validation...')
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Verify the change
      const accountInfoAfter = await client.request({
        command: 'account_info',
        account: ISSUER_ADDRESS,
        ledger_index: 'validated'
      })

      const newFlags = accountInfoAfter.result.account_data.Flags
      const hasRequireAuthAfter = newFlags && (newFlags & 0x00040000) !== 0

      console.log(`📊 New Flags: ${newFlags}`)
      console.log(`📊 New Flags (hex): 0x${newFlags?.toString(16)}`)
      console.log(`📊 RequireAuth Enabled: ${hasRequireAuthAfter ? '✅ YES' : '❌ NO'}`)

      if (hasRequireAuthAfter) {
        console.log('\n🎉 RequireAuth successfully enabled!')
        console.log('   You can now create authorization requests in the platform.')
      } else {
        console.log('\n⚠️  RequireAuth may not be enabled yet. Please wait a few more seconds and check again.')
      }

    } else {
      console.log('❌ Transaction failed!')
      console.log(`📋 Engine Result: ${submitResponse.result.engine_result}`)
      console.log(`📋 Engine Result Message: ${submitResponse.result.engine_result_message}`)
    }

    await client.disconnect()
    console.log('✅ Disconnected from XRPL')

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    if (error.data) {
      console.error('📋 Error Data:', JSON.stringify(error.data, null, 2))
    }
  }
}

// Run the script
enableRequireAuth()
