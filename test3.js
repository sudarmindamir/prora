const l = "1. **PHOTOGRAPHY_GENRE**: fashion editorial";
const cl = l.replace(/\*\*/g, '');
const m = cl.match(/([a-z_]+)\s*:\s*(.+)/i);
console.log(m[1].toUpperCase(), m[2].trim());
