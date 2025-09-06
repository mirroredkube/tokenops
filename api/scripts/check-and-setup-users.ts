import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Checking current organizations and users...')
  
  // Check organizations
  const orgs = await prisma.organization.findMany({
    include: {
      users: true
    }
  })
  
  console.log('\nOrganizations:')
  orgs.forEach(org => {
    console.log(`- ${org.name} (subdomain: ${org.subdomain}, tenantId: ${org.tenantId})`)
    console.log(`  Users: ${org.users.length}`)
    org.users.forEach(user => {
      console.log(`    - ${user.email} (${user.name}) - Role: ${user.role}`)
    })
  })
  
  // Check if we need to create a user for am1 org
  const am1Org = await prisma.organization.findFirst({
    where: { subdomain: 'am1' }
  })
  
  if (am1Org) {
    const am1Users = await prisma.user.findMany({
      where: { organizationId: am1Org.id }
    })
    
    if (am1Users.length === 0) {
      console.log('\nNo users found for am1 organization. Creating one...')
      
      // Create a user for am1 organization
      const am1User = await prisma.user.create({
        data: {
          email: 'am1@example.com',
          name: 'AM1 User',
          sub: 'am1-user-sub', // This should match what Google OAuth returns
          role: 'ADMIN',
          organizationId: am1Org.id
        }
      })
      
      console.log(`Created user: ${am1User.email} for am1 organization`)
    } else {
      console.log(`\nam1 organization already has ${am1Users.length} user(s)`)
    }
  } else {
    console.log('\nNo am1 organization found. Please create it first.')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
