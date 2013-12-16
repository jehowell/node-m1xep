var EventEmitter = require('events').EventEmitter;
var serialport = require("serialport");
var SerialPort = serialport.SerialPort;
var Command = require('./command');

function Server(options) {
	
	var self = this;
	
	EventEmitter.call(self);
	
	self.serialport = new SerialPort(options.port || "/dev/ttyUSB0", {
		  baudrate: 115200,
		  databits: 8,
		  stopbits: 1,
		  parity : 'none',
		  parser: serialport.parsers.readline("\n")
	});
	
	self.serialport.on('open', function(){
		 console.log('open');
		 self.serialport.on('data', function(data) {
		    //console.log('data received: ' + data);
		    	try {
		    		var command = Command.parse(data);
		    		self._addCommand(command);
		    	}
		    	catch (err) {
		    	}
		  });
	});
	
	self.connections = [];
}

require('util').inherits(Server, EventEmitter);

Server.prototype._addCommand = function(command) {
	// todo: filter by command type
	console.log('adding command', command);
	var self = this;
	var data = Command.stringify(command)+'\n';
	self.connections.forEach(function(c){
		self._sendTo(c,data);
	});
};

Server.prototype._sendTo = function(c, data) {
	try {
		c.write( c );
	}
	catch (err) {
		console.error('failed to write!', err, c);
	}
};

Server.prototype._sendCommand = function(command) {
	var self = this;
	console.log('send command', command);
	self._sendTo(self.serialport, Command.stringify(command)+'\n');
};

Server.prototype._addConnection = function(connection){
	var self = this;
	console.log('got connection ', connection);
	
	self.connections.push(connection);
	
	connection.setEncoding('utf8');
	
	var buffer = '';
	
	connection.on('data', function(data){
		buffer += data;
		var i;
		while ( (i=buffer.indexOf('\n'))>=0 ) {
			var raw = buffer.substr(0,i);
			buffer = buffer.substr(i+1);
			
			var command = Command.parse(raw);
			if (command) {
				console.log('client requested command', command);
				self._sendCommand(command);
			}
		}
	});
	
	connection.on('end', function(){
		var index = self.connections.indexOf(connection);
		if (index>=0) {
			self.connections.splice(index,1);
		}
	});
	
	connection.on('error', function(err){
		console.error('got error from connection', err);
	});
	
};

Server.prototype.listen = function(port, tlsOptions, callback) {
	
	var self = this;
	if (typeof(tlsOptions) == 'object' && tlsOptions) {
		self.server = require('tls').createServer(tlsOptions);
	}
	else {
		self.server = require('net').createServer();
	}
	
	self.server.on('connection', function(c) {
		self._addConnection(c);
	});
	
	self.server.on('error', function(err){
		self.emit('error', err);
	})
	
	self.server.listen(port, function(){
		if (typeof(callback) == 'function') {
			return callback();
		}
		else if (typeof(tlsOptions) == 'function') {
			return tlsOptions();
		}
	});
	
};

module.exports = Server;