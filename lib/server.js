var EventEmitter = require('events').EventEmitter;
var SerialPort = require("serialport").SerialPort

function Server(options) {
	
	var self = this;
	
	EventEmitter.call(self);
	
	self.options = options || {};
	self.serialport = new SerialPort(self.options.port || "/dev/ttyUSB0", {
		  baudrate: 115200,
		  databits: 8,
		  stopbits: 1,
		  parity : 'none'
	});
	
	self.serialport.on('open', function(){
		 console.log('open');
		 self.serialPort.on('data', function(data) {
		    console.log('data received: ' + data);
		  });
	});
}

require('util').inherit(Server, EventEmitter);

Server.prototype.listen = function(port, callback) {
	
};

module.exports = Server;