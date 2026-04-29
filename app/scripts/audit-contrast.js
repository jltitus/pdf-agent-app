const fs = require('fs')
const path = require('path')

const root = process.cwd()
const extensions = new Set(['.tsx', '.ts', '.jsx', '.js', '.css'])

const riskyPatterns = [
  'text-gray-300',
  'text-gray-400',
  'text-gray-500',
  'text-gray-600',
  'text-gray-700',
  'placeholder-gray',
  'opacity-50',
  'opacity-60',
  'opacity-70',
  '→',
]

function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
   if (['node_modules', '.next', '.git', 'scripts'].includes(entry.name)) continue
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      walk(fullPath, results)
    } else if (extensions.has(path.extname(entry.name))) {
      results.push(fullPath)
    }
  }

  return results
}

const files = walk(root)
let issueCount = 0

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8')
  const lines = content.split('\n')

  lines.forEach((line, index) => {
    riskyPatterns.forEach((pattern) => {
      if (line.includes(pattern)) {
  if (pattern === 'opacity-60' && line.includes('disabled:opacity-60')) {
    return
  }
        issueCount++
        console.log(`${file}:${index + 1} contains "${pattern}"`)
        console.log(`  ${line.trim()}`)
      }
    })
  })
}

if (issueCount === 0) {
  console.log('✅ No obvious contrast issues found.')
} else {
  console.log(`\n⚠️ Found ${issueCount} possible contrast issues.`)
}