const fs = require('fs');
const path = 'C:\\Users\\李卓潼\\AppData\\Local\\Temp\\werewolf-test-v3.log';
try {
    const data = fs.readFileSync(path, 'utf8');
    const lines = data.split('\n');
    lines.forEach((l, i) => console.log((i + 1).toString().padStart(3, ' ') + '|' + l));
} catch (e) {
    console.error('Error:', e.message);
}
