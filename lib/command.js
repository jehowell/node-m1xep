function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

function hex(value) {
	return pad(value.toString(16),2).toUpperCase();
}


module.exports.parse = function(raw) {
	raw = raw.replace('/r','');
	var parsed = { raw:raw };
	var length 	= parseInt(raw.substr(0,2),16);
	
	parsed.type 	= raw.substr(2,1);
	parsed.subtype  = raw.substr(3,1);
	parsed.data		= raw.substr(4, length - 6); 
	parsed.cksum	= raw.substr(-2,2);
	
	return parsed;
}

module.exports.stringify = function(command) {
	
	var length = (command.data.length + 6);
	var raw = hex(length);
	raw += command.type;
	raw += command.subtype;
	raw += command.data;
	raw += '00';
	
	var sum = 0;
	for (var i = 0; i < raw.length; ++i) {
		sum += raw.charCodeAt(i);
	}
	sum = sum % 256;
	
	raw += hex(256-sum);
	
	return raw;
	
}