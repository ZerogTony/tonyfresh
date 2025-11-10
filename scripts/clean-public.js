const fs = require('fs')
const path = require('path')

const publicDir = path.join(__dirname, '..', 'public')

if (!fs.existsSync(publicDir)) {
  console.log(`Nothing to clean. ${publicDir} does not exist.`)
  process.exit(0)
}

const entries = fs.readdirSync(publicDir)

entries.forEach(entry => {
  const entryPath = path.join(publicDir, entry)
  fs.rmSync(entryPath, { recursive: true, force: true })
})

console.log(`Cleaned ${entries.length} item(s) from ${publicDir}`)
