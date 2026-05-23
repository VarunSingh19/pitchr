const fs = require('fs');
const f = 'app/dashboard/campaign/new/page.tsx';
let c = fs.readFileSync(f, 'utf8');
// Replace all \${varName} with ${varName} to enable template literal interpolation
c = c.replace(/\\\$\{(shortGeo|rolesStr|rolesList|stackStr|companyStr|jobAge|location|role1|role2|tech1|tech2|geo)\}/g, function(match, varName) {
  return '${' + varName + '}';
});
fs.writeFileSync(f, c);
console.log('Fixed all escaped template interpolations');
