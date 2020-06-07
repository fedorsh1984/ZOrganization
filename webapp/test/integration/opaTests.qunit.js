/* global QUnit */

QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function() {
	"use strict";

	sap.ui.require([
		"zorg/ZOrganizations2/test/integration/AllJourneys"
	], function() {
		QUnit.start();
	});
});