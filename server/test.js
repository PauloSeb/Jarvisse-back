var UpnpControlPoint = require("../lib/upnp-controlpoint").UpnpControlPoint;

var handleDevice = function(device) {
	//console.log(device);

	switch(device.deviceType) {
		case "urn:schemas-upnp-org:device:tv:1":
			console.log("Une TV connectée!");
		    var eventService = device.services['urn:schemas-upnp-org:serviceId:power:1'];
			//Subscribe
			/*eventService.subscribe(function() {
				eventService.on("stateChange", function(value) {
					console.log(JSON.stringify(value));
				});
			});*/
			//SetPower
			//console.log("SetPower");
			/*eventService.callAction("SetPower", { Power : 0 }, function(err, buf) {
				if (err) {
					console.log("got err when performing action: " + err + " => " + buf);
				} else {
					console.log("got SOAP reponse: " + buf);
				}
			});*/
			//GetPower
			//console.log("GetPower");
			/*eventService.callAction("GetPower", { }, function(err, buf) {
				if (err) {
					console.log("got err when performing action: " + err + " => " + buf);
				} else {
					console.log("got SOAP reponse: " + buf);
				}
			});*/
		break;
		case "urn:schemas-upnp-org:device:clock:1":
			console.log("Une horloge connectée!");
			var eventService = device.services['urn:schemas-upnp-org:serviceId:timer:1'];
			//Subscribe
			eventService.subscribe(function() {
				eventService.on("stateChange", function(value) {
					console.log(JSON.stringify(value));
				});
			});
			//SetTime (not implemented)
			//console.log("SetTime");
			/*eventService.callAction("SetTime", { CurrentTime : 'Wed, Mar 05, 14' }, function(err, buf) {
				if (err) {
					console.log("got err when performing action: " + err + " => " + buf);
				} else {
					console.log("got SOAP reponse: " + buf);
				}
			});*/
			//GetTime
			//console.log("GetTime");
			/*eventService.callAction("GetTime", { }, function(err, buf) {
				if (err) {
					console.log("got err when performing action: " + err + " => " + buf);
				} else {
					console.log("got SOAP reponse: " + buf);
				}
			});*/
	};
}

var cp = new UpnpControlPoint();

cp.on("device", handleDevice);
cp.search();
