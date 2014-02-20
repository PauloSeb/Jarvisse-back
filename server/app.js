//Global var
var lampeHalogeneTimeout = 3000;
var devices = new Array();
//REST
var express = require('express');
var app = express();
app.listen(5000);
console.log("Server listening on port 5000");
//UPNP
var UpnpControlPoint = require("../lib/upnp-controlpoint").UpnpControlPoint;
var cp = new UpnpControlPoint();
cp.search();
cp.on("device", function(device){
	devices[device.deviceType] = device;
});