var command = require(__dirname+ '/../lib/command');


var parsed = command.parse('16XK45042011512130100078');
console.log('parsed', parsed);

var raw = command.stringify(parsed);
console.log('raw', raw);