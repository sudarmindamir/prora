const l = "PHOTOGRAPHY_GENRE: fashion editorial";
const cl = l.replace(/\*\*/g, '');
console.log("cl:", cl);
const m = cl.match(/([a-z_]+)\s*:\s*(.+)/i);
console.log("m:", m);
