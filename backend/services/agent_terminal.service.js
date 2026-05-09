const pty = require('node-pty')

const agentTerminals = new Map() // userId → pty process

function getAgentTerminal(userId) {
  if (agentTerminals.has(userId)) return agentTerminals.get(userId)
  
  const term = pty.spawn('bash', [], {
    name: 'xterm-color',
    cols: 120,
    rows: 50,
    cwd: '/tmp',
    env: process.env
  })
  
  const state = { term, output: [] }
  term.onData(data => state.output.push(data))
  agentTerminals.set(userId, state)
  return state
}

async function agentRun(userId, command, timeoutMs = 15000) {
  const { term, output } = getAgentTerminal(userId)
  const before = output.length
  const DONE = `__AGENT_DONE_${Date.now()}__`
  
  return new Promise((resolve) => {
    term.write(`${command} && echo "${DONE}" || echo "${DONE}"\n`)
    
    const check = setInterval(() => {
      const result = output.slice(before).join('')
      if (result.includes(DONE)) {
        clearInterval(check)
        resolve(result.replace(DONE, '').trim())
      }
    }, 100)
    
    setTimeout(() => { clearInterval(check); resolve('timeout') }, timeoutMs)
  })
}

module.exports = { agentRun }
