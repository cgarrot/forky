import { PrismaClient } from '@prisma/client'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

function hashPassword(password) {
  const salt = randomBytes(16)
  const derived = scryptSync(password, salt, 64)
  return `scrypt:${salt.toString('hex')}:${derived.toString('hex')}`
}

function verifyPassword(password, stored) {
  const parts = stored.split(':')
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false
  }
  const salt = Buffer.from(parts[1], 'hex')
  const expected = Buffer.from(parts[2], 'hex')
  const actual = scryptSync(password, salt, expected.length)
  return timingSafeEqual(expected, actual)
}

async function main() {
  const prisma = new PrismaClient()

  const email = 'demo@forky.app'
  const password = 'DemoPassword123!'
  const now = new Date()

  const existing = await prisma.user.findUnique({ where: { email } })

  const passwordHash =
    existing?.passwordHash && verifyPassword(password, existing.passwordHash)
      ? existing.passwordHash
      : hashPassword(password)

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      username: 'demo',
      passwordHash,
      deletedAt: null,
    },
    create: {
      id: 'clx123abc',
      email,
      username: 'demo',
      passwordHash,
      firstName: 'Demo',
      lastName: 'User',
      preferences: { theme: 'dark', language: 'fr' },
      createdAt: now,
      updatedAt: now,
    },
  })

  await prisma.project.upsert({
    where: { id: 'clxproj123' },
    update: {
      ownerId: user.id,
      deletedAt: null,
    },
    create: {
      id: 'clxproj123',
      name: 'Demo Project',
      description: 'A demonstration project',
      systemPrompt: 'You are a helpful assistant.',
      ownerId: user.id,
      viewport: { x: 0, y: 0, zoom: 1 },
      isPublic: false,
      nodeCount: 0,
      memberCount: 1,
      createdAt: now,
      updatedAt: now,
      members: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
  })

  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  process.exit(1)
})
