const pty = require('node-pty')
const path = require('path')

const terminals = new Map() // projectId → pty process

function getOrCreateTerminal(projectId, userId) {
  if (terminals.has(projectId)) return terminals.get(projectId)
  
  const cwd = path.join('/tmp/jarvis_projects', userId, projectId)
  require('fs').mkdirSync(cwd, { recursive: true })
  
  const term = pty.spawn('bash', [], {
    name: 'xterm-color',
    cols: 120,
    rows: 50,
    cwd,
    env: process.env
  })
  
  terminals.set(projectId, { term, output: [], cwd })
  
  term.onData(data => {
    terminals.get(projectId).output.push(data)
  })
  
  return terminals.get(projectId)
}

async function runCommand(projectId, userId, command) {
  const { term, output } = getOrCreateTerminal(projectId, userId)
  const before = output.length
  
  return new Promise((resolve) => {
    const DONE = `__DONE_${Date.now()}__`
    term.write(`${command} && echo "${DONE}" || echo "${DONE}"\n`)
    
    const check = setInterval(() => {
      const newOutput = output.slice(before).join('')
      if (newOutput.includes(DONE)) {
        clearInterval(check)
        resolve(newOutput.replace(DONE, '').trim())
      }
    }, 100)
    
    // Timeout 30s
    setTimeout(() => { clearInterval(check); resolve('timeout') }, 30000)
  })
}

function killTerminal(projectId) {
  if (terminals.has(projectId)) {
    terminals.get(projectId).term.kill()
    terminals.delete(projectId)
  }
}

module.exports = { runCommand, killTerminal, getOrCreateTerminal }
