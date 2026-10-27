const fs = require('fs');
const dir = 'C:/Users/JACKISON/.cursor/projects/d-DDigital-Cursor-DC-Digital/agent-transcripts/b97a3c79-2407-4ba0-b611-d7d97f70305e/subagents/';
const out = [];
for (const f of ['b7beb01a-5abe-4d69-b089-6465fcf6d2f0', '83274a67-ee44-47d8-a86c-dd7b5bb585ab']) {
  const lines = fs.readFileSync(dir + f + '.jsonl', 'utf8').trim().split('\n');
  let found = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    const o = JSON.parse(lines[i]);
    if (o.role === 'assistant') { found = o; break; }
  }
  const text = found.message.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
  out.push('========== ' + f + ' ==========\n' + text);
}
fs.writeFileSync('subaudits.txt', out.join('\n\n'), 'utf8');
console.log('written');
