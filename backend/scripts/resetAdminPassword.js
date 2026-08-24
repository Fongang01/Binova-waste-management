import 'dotenv/config'
import bcryptjs from 'bcryptjs'
import prisma from '../src/config/prisma.js'

const ADMIN_EMAIL = 'admin@binova.cm'
const NEW_PASSWORD = 'BinovaAdmin@2026'

async function resetAdminPassword() {
  try {
    // Find the existing admin user
    const user = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL }
    })

    if (!user) {
      console.error(`❌ Error: User with email '${ADMIN_EMAIL}' not found.`)
      process.exit(1)
    }

    // Hash the new password
    const passwordHash = await bcryptjs.hash(NEW_PASSWORD, 12)

    // Update only the passwordHash, keeping all other fields intact
    const updatedUser = await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { passwordHash }
    })

    console.log('✓ Admin password reset successfully.')
    console.log(`✓ User: ${updatedUser.firstName} ${updatedUser.lastName} (${updatedUser.email})`)
    console.log(`✓ Role: ${updatedUser.role}`)
    console.log(`✓ Status: ${updatedUser.status}`)

  } catch (error) {
    console.error('❌ Error during password reset:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

resetAdminPassword()
