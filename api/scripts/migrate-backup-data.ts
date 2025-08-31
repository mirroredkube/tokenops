import { PrismaClient, UserRole, UserStatus } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

interface BackupUser {
  id: string
  email: string
  name: string | null
  sub: string
  role: string
  twoFactorSecret: string | null
  twoFactorEnabled: boolean
  createdAt: string
  updatedAt: string
}

interface BackupUserSettings {
  id: string
  userId: string
  timezone: string
  language: string
  theme: string
  notifications: any
  preferences: any
  createdAt: string
  updatedAt: string
}

async function migrateBackupData() {
  console.log('🔄 Starting backup data migration...')

  try {
    // Step 1: Ensure default organization exists
    console.log('🏢 Ensuring default organization exists...')
    const defaultOrg = await prisma.organization.findFirst({
      where: { name: 'Default Organization' }
    })

    if (!defaultOrg) {
      console.log('❌ Default organization not found. Please run the seed script first:')
      console.log('   pnpm prisma db seed')
      return
    }

    console.log('✅ Default organization found:', defaultOrg.name)

    // Step 2: Parse backup data (simulated from the backup file)
    console.log('📋 Parsing backup user data...')
    
    // User data from backup file
    const backupUsers: BackupUser[] = [
      {
        id: 'cmeyoxre20000759x28bkocb3',
        email: 'anitha.ramaswamy.2015@gmail.com',
        name: 'Anitha Ramaswamy',
        sub: '104629482050741817573',
        role: 'user',
        twoFactorSecret: null,
        twoFactorEnabled: false,
        createdAt: '2025-08-30 20:04:58.73',
        updatedAt: '2025-08-30 20:04:58.73'
      },
      {
        id: 'cmeyp0f1d00003dz6d5n1b0j0',
        email: 'povordinary@gmail.com',
        name: 'Ordinary Pov',
        sub: '115606880869302730446',
        role: 'user',
        twoFactorSecret: null,
        twoFactorEnabled: false,
        createdAt: '2025-08-30 20:07:02.69',
        updatedAt: '2025-08-30 20:07:02.69'
      },
      {
        id: 'cmezjiy930000h1lqrt76hjep',
        email: 'aramaswa2005@gmail.com',
        name: 'Anitha Ramaswamy',
        sub: '100259940519902529407',
        role: 'user',
        twoFactorSecret: 'JICBMPLIDVIBGKJ2',
        twoFactorEnabled: true,
        createdAt: '2025-08-31 10:21:15.879',
        updatedAt: '2025-08-31 10:22:19.379'
      }
    ]

    // UserSettings data from backup file
    const backupUserSettings: BackupUserSettings[] = [
      {
        id: 'cmeyqkt6y00014jxoc8d7fhpy',
        userId: 'cmeyp0f1d00003dz6d5n1b0j0',
        timezone: 'America/New_York',
        language: 'en',
        theme: 'light',
        notifications: { push: false, email: false, security: true },
        preferences: {},
        createdAt: '2025-08-30 20:50:53.771',
        updatedAt: '2025-08-30 20:52:04.541'
      }
    ]

    console.log(`📊 Found ${backupUsers.length} users and ${backupUserSettings.length} user settings`)

    // Step 3: Migrate users
    console.log('👥 Migrating users...')
    let migratedUsers = 0
    let skippedUsers = 0

    for (const backupUser of backupUsers) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: backupUser.email }
        })

        if (existingUser) {
          console.log(`⏭️  Skipping existing user: ${backupUser.email}`)
          skippedUsers++
          continue
        }

        // Map old role to new UserRole enum
        let newRole: UserRole
        switch (backupUser.role) {
          case 'admin':
            newRole = UserRole.ADMIN
            break
          case 'user':
          default:
            newRole = UserRole.VIEWER
            break
        }

        // Create user with new schema
        const newUser = await prisma.user.create({
          data: {
            id: backupUser.id, // Preserve original ID
            email: backupUser.email,
            name: backupUser.name,
            sub: backupUser.sub,
            twoFactorSecret: backupUser.twoFactorSecret,
            twoFactorEnabled: backupUser.twoFactorEnabled,
            organizationId: defaultOrg.id,
            status: UserStatus.ACTIVE,
            role: newRole,
            createdAt: new Date(backupUser.createdAt),
            updatedAt: new Date(backupUser.updatedAt)
          }
        })

        console.log(`✅ Migrated user: ${newUser.email} (${newUser.role})`)
        migratedUsers++

      } catch (error) {
        console.error(`❌ Failed to migrate user ${backupUser.email}:`, error)
      }
    }

    // Step 4: Migrate user settings
    console.log('⚙️  Migrating user settings...')
    let migratedSettings = 0
    let skippedSettings = 0

    for (const backupSettings of backupUserSettings) {
      try {
        // Check if settings already exist
        const existingSettings = await prisma.userSettings.findUnique({
          where: { userId: backupSettings.userId }
        })

        if (existingSettings) {
          console.log(`⏭️  Skipping existing settings for user: ${backupSettings.userId}`)
          skippedSettings++
          continue
        }

        // Create user settings
        const newSettings = await prisma.userSettings.create({
          data: {
            id: backupSettings.id, // Preserve original ID
            userId: backupSettings.userId,
            timezone: backupSettings.timezone,
            language: backupSettings.language,
            theme: backupSettings.theme,
            notifications: backupSettings.notifications,
            preferences: backupSettings.preferences,
            createdAt: new Date(backupSettings.createdAt),
            updatedAt: new Date(backupSettings.updatedAt)
          }
        })

        console.log(`✅ Migrated settings for user: ${backupSettings.userId}`)
        migratedSettings++

      } catch (error) {
        console.error(`❌ Failed to migrate settings for user ${backupSettings.userId}:`, error)
      }
    }

    // Step 5: Summary
    console.log('\n📊 Migration Summary:')
    console.log(`👥 Users: ${migratedUsers} migrated, ${skippedUsers} skipped`)
    console.log(`⚙️  Settings: ${migratedSettings} migrated, ${skippedSettings} skipped`)
    console.log('✅ Migration completed successfully!')

    // Step 6: Verification
    console.log('\n🔍 Verifying migration...')
    const totalUsers = await prisma.user.count()
    const totalSettings = await prisma.userSettings.count()
    console.log(`📈 Total users in database: ${totalUsers}`)
    console.log(`📈 Total user settings in database: ${totalSettings}`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

// Run migration
migrateBackupData()
  .catch((error) => {
    console.error('❌ Fatal error during migration:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
