//Global vars
var uPnPdevices = new Array();
var sensor = new Array();

//REST
var express = require('express');
var app = express();
app.listen(5000);
console.log("Server listening on port 5000");

//UPnP
var UpnpControlPoint = require("../lib/upnp-controlpoint").UpnpControlPoint;
var cp = new UpnpControlPoint();
cp.search();
cp.on("device", function(device){
	uPnPdevices[device.deviceType] = device;
});

//Events
var events = require('events');
var eventEmitter = new events.EventEmitter();


var homePositionX = 0;
var homePositionY = 0;

distance = function(x1, y1, x2, y2){
	return Math.sqrt(Math.pow(x1-x2,2) + Math.pow(y1-y2));
}

//Events handling
handlePositionChange = function(){
	var d = distance(sensor['Android'].positionX, sensor['Android'].positionY, homePositionX, homePositionY);
}

//events availables
eventEmitter.on('positionChange', handlePositionChange);