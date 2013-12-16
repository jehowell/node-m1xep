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
	self.users = options.users || false;
}

require('util').inherits(Server, EventEmitter);

Server.prototype._addCommand = function(command) {
	console.log('adding command', command);
	var self = this;
	var data = Command.stringify(command);
	self.connections.forEach(function(c){
		self._sendTo(c,data);
	});
};

Server.prototype._sendTo = function(c, data) {
	try {
		console.log('writing ('+data+')');
		c.write( data+'\r\n' );
	}
	catch (err) {
		console.error('failed to write!', err, typeof(c), c.remoteAddress);
	}
};

Server.prototype._sendCommand = function(command) {
	var self = this;
	console.log('send command', command);
	self._sendTo(self.serialport, Command.stringify(command));
};

Server.prototype._addConnection = function(connection){
	var self = this;
	console.log('got connection ', connection.remoteAddress);
	
	self.connections.push(connection);
	
	connection.setEncoding('utf8');
	
	var auth = self.users === false;
	
	var buffer = '';
	var user = null;
	
	connection.on('data', function(data){
		console.log('got data', data);
		buffer += data;
		
		while (buffer.length > 0) {
			var r = buffer.indexOf('\r');
			var n = buffer.indexOf('\n');
			var i = r;
			if (n < r && n != -1 ) {
				i = n;
			}
			if (i < 0 ) {
				break;
			}
			
			var raw = buffer.substr(0,i);
			buffer = buffer.substr(i+1);
			
			if (raw.length == 0 ) {
				break;
			}
			
			console.log('got message', raw);
			
			if (!auth) {
				if (!user) {
					user = raw;
				}
				else {
					var pass = self.users[user];
					if (pass == raw ) {
						console.log('user authorized!', user);
						self._sendTo(connection, 'OK');
						auth = true;
					}
					else {
						console.log('user failed!', user, raw);
						connection.end();
						return;
					}
				}
			}
			else {
				var command = Command.parse(raw);
				if (command) {
					console.log('client requested command', command);
					self._sendCommand(command);
				}
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
		connection.emit('end');
	});
	
};

Server.prototype.listen = function(port, tlsOptions, callback) {
	
	var self = this;
	
	var connectionHandler =function(c){
		self._addConnection(c);
	};
	
	if (typeof(tlsOptions) == 'object') {
		console.log('creating secure server');
		self.server = require('tls').createServer(tlsOptions, connectionHandler);
	}
	else {
		self.server = require('net').createServer(connectionHandler);
	}
	
	self.server.on('error', function(err){
		self.emit('error', err);
	});
	
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