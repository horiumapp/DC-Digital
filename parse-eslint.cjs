const fs = require('fs'); 
const r = JSON.parse(fs.readFileSync('eslint-report-new.json', 'utf8')); 
const issues = r.filter(x => x.errorCount > 0 || x.warningCount > 0); 
console.log("Files with issues: " + issues.length); 
issues.forEach(x => { 
  console.log(x.filePath.split('DC Digital')[1] + ": " + x.errorCount + " Errors, " + x.warningCount + " Warnings"); 
  x.messages.forEach(m => console.log("  - [" + (m.severity === 2 ? 'E' : 'W') + "] " + m.ruleId + ": " + m.message + " (Line " + m.line + ")")); 
});
