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
	switch(device.deviceType) {
		case 'urn:schemas-upnp-org:device:PhotoTextViewer:1':
			device.services['urn:schemas-upnp-org:serviceId:1'].subscribe(function() {
				device.services['urn:schemas-upnp-org:serviceId:1'].on("stateChange", function(value) {
					console.log(JSON.stringify(value));
				});
			});
			device.services['urn:schemas-upnp-org:serviceId:2'].subscribe(function() {
				device.services['urn:schemas-upnp-org:serviceId:1'].on("stateChange", function(value) {
					console.log(JSON.stringify(value));
				});
			});
		break;
		case 'urn:schemas-upnp-org:device:AudioPlayer:1':
			device.services['urn:schemas-upnp-org:serviceId:1'].subscribe(function() {
				device.services['urn:schemas-upnp-org:serviceId:1'].on("stateChange", function(value) {
					console.log(JSON.stringify(value));
				});
			});
		break;
		case 'urn:schemas-upnp-org:device:X10CM11:1':
			device.services['urn:schemas-upnp-org:serviceId:2'].subscribe(function() {
				device.services['urn:schemas-upnp-org:serviceId:1'].on("stateChange", function(value) {
					console.log(JSON.stringify(value));
				});
			});
		break;
	}
});

//Events
var events = require('events');
var eventEmitter = new events.EventEmitter();


var homePositionX = 0;
var homePositionY = 0;

distance = function(x1, y1, x2, y2){
	return Math.sqrt(Math.pow(x1-x2,2) + Math.pow(y1-y2));
}

function distFrom(lat1, lng1, lat2, lng2) {
	var toRadians = function(d){ return 	d * (Math.PI / 180);}

    var earthRadius = 6369;
    var dLat = toRadians(lat2-lat1);
    var dLng = toRadians(lng2-lng1);
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
               Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
               Math.sin(dLng/2) * Math.sin(dLng/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var dist = earthRadius * c;
    return dist;
}

//Events handling
handlePositionChange = function(){
	var d = distFrom(sensor['Android'].positionX, sensor['Android'].positionY, homePositionX, homePositionY);
	var val = 'off';
	if(d < 50)
		val = 'on';
	setSensor('Lamp', 'power', val);
}

//events availables
eventEmitter.on('positionChange', handlePositionChange);