import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mysql from 'mysql2/promise'

const [,, name, email, password] = process.argv
if (!name || !email || !password) throw new Error('Usage: node server/seed-admin.js "Admin Name" admin@example.com "strong-password"')
const db = await mysql.createConnection({ uri: process.env.DATABASE_URL })
const hash = await bcrypt.hash(password, 12)
await db.execute('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, "admin") ON DUPLICATE KEY UPDATE name=VALUES(name), password_hash=VALUES(password_hash), role="admin", active=1', [name, email, hash])
await db.end()
console.log(`Admin account ready: ${email}`)
