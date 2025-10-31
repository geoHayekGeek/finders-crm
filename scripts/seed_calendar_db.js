/*
  Direct DB seeding without HTTP/auth.
  Usage:
    node scripts/seed_calendar_db.js --count=40
  Requires DB env vars used by backend/config/db (or .env loaded by that module).
*/

const path = require('path')
const pool = require(path.join('..', 'backend', 'config', 'db'))

function parseArgs(argv) {
  const args = { count: 40 }
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--count=')) args.count = parseInt(arg.split('=')[1], 10) || 40
  }
  return args
}

async function main() {
  const { count } = parseArgs(process.argv)
  const client = await pool.connect()
  try {
    console.log(`Seeding ${count} events...`)
    await client.query('BEGIN')

    const users = (await client.query('SELECT id, name, role FROM users')).rows
    if (users.length === 0) throw new Error('No users found')
    const properties = (await client.query('SELECT id FROM properties')).rows
    const leads = (await client.query('SELECT id FROM leads')).rows

    await client.query('DELETE FROM calendar_events')

    const colors = ['blue', 'green', 'red', 'yellow', 'purple', 'pink']
    const types = ['meeting', 'showing', 'inspection', 'closing', 'other']

    const now = new Date()
    let created = 0

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
    const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

    for (let i = 0; i < count; i++) {
      const creator = pick(users)
      const assignedTo = pick(users)

      const dayOffset = randomInt(-30, 30)
      const startHour = randomInt(8, 17)
      const durationHours = [1, 1, 2, 2, 3][randomInt(0, 4)]

      const start = new Date(now)
      start.setDate(now.getDate() + dayOffset)
      start.setHours(startHour, 0, 0, 0)
      const end = new Date(start)
      end.setHours(startHour + durationHours)

      const attendeeCount = randomInt(0, Math.min(4, users.length))
      const shuffled = [...users].sort(() => Math.random() - 0.5)
      const attendeeUsers = shuffled.slice(0, attendeeCount)
      const attendees = attendeeUsers.map(u => u.name)

      const propertyId = properties.length && Math.random() < 0.7 ? pick(properties).id : null
      const leadId = leads.length && Math.random() < 0.7 ? pick(leads).id : null

      const title = `${pick(['Meeting','Showing','Inspection','Call','Follow-up'])} #${i + 1}`
      const description = Math.random() < 0.5 ? 'Auto-seeded demo event.' : null
      const color = pick(colors)
      const type = pick(types)
      const location = Math.random() < 0.5 ? 'Office' : 'On-site'
      const notes = Math.random() < 0.4 ? 'Bring documents.' : null

      await client.query(
        `INSERT INTO calendar_events (
          title, description, start_time, end_time, all_day,
          color, type, location, attendees, notes, created_by, assigned_to,
          property_id, lead_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          title,
          description,
          start,
          end,
          false,
          color,
          type,
          location,
          attendees,
          notes,
          creator.id,
          assignedTo.id,
          propertyId,
          leadId
        ]
      )
      created++
    }

    await client.query('COMMIT')
    console.log(JSON.stringify({ success: true, message: 'Events reset and seeded', count: created }, null, 2))
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Error:', err.message)
    process.exitCode = 1
  } finally {
    client.release()
    // Do not end the pool; reuse in dev if needed
  }
}

main()


