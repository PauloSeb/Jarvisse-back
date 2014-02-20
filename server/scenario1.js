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


app.get('/UPnP/lampeHalogene/on', function(req, res) {
	var device = devices['urn:schemas-upnp-org:device:X10CM11:1'];
	console.log(device.udn);
	var eventService = device.services['urn:schemas-upnp-org:serviceId:2'];
	eventService.callAction("ExecuteCommand", {ElementName: "Lampe_Halogene", Command: "On" }, function(err, buf) {
		if (err) {
		console.log("got err when performing action: " + err + " => " + buf);
		res.send(JSON.stringify({lampeHalogene: "error"}));
		} else {
			console.log("got SOAP reponse: " + buf);
			res.send(JSON.stringify({lampeHalogene: "on"}));
			setTimeout(function () {
				eventService.callAction("ExecuteCommand", {ElementName: "Lampe_Halogene", Command: "Off" }, function(err, buf) {
					if (err) {
						console.log("got err when performing action: " + err + " => " + buf);
					} else {
						console.log("got SOAP reponse: " + buf);
					}
				});
			},lampeHalogeneTimeout);
		}
	});
});

app.get('/user/journee/bien', function(req, res) {
	console.log("User had a good day");
	res.send("Super!");
});

app.get('/user/journee/mauvais', function(req, res) {
	console.log("User had a bad day");
	res.send("Bad!");
});