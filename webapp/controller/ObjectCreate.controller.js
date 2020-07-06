sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/m/MessageToast",
	"sap/ui/core/Fragment",
	"sap/ui/core/message/ControlMessageProcessor",
	"sap/m/MessagePopover",
	"sap/m/MessagePopoverItem",
	'sap/ui/core/message/Message',
	'sap/ui/core/library'
], function (BaseController, JSONModel, formatter,MessageToast,Fragment,ControlMessageProcessor,MessagePopover,MessagePopoverItem,Message,coreLibrary) {
	"use strict";
	var MessageType = coreLibrary.MessageType;
	return BaseController.extend("zorg.ZOrganizations2.controller.ObjectCreate", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf zorg.ZOrganizations2.view.ObjectCreate
		 */
		onInit: function () {
			// create a message manager and register the message model
			var oMessageProcessor = new ControlMessageProcessor();
			this._oMessageManager = sap.ui.getCore().getMessageManager();
			this._oMessageManager.registerMessageProcessor(oMessageProcessor);

			this.getRouter().getRoute("objectcreate").attachPatternMatched(this._onCreateMatched, this);
			Fragment.load({
					id: this.getView().getId(),
					name: "zorg.ZOrganizations2.view.fragment.Change"
				}).then(function (oFormFragment) {
					// connect dialog to the root view of this component (models, lifecycle)
					var oPage = this.byId("page");
					oPage.setContent(oFormFragment);	
				}.bind(this));			
		},
		
		_onCreateMatched: function (oEvent) {
			// var sObjectId = oEvent.getParameter("arguments").objectId;
			// create a binding context for a new order item
			this.oContext = this.getModel().createEntry("/zord_organiz_cds", {
				properties: {
					"name" : "Joz2"
				},
				success: this._onCreateSuccess.bind(this)
			});
			this.getView().setBindingContext(this.oContext);

			// reset potential server-side messages
			this._oMessageManager.removeAllMessages();
			this._oMessageManager.addMessages(
				new Message({
					message: "Something wrong happened",
					type: MessageType.Error,
					processor: new ControlMessageProcessor()
				})
			);			
		},

		_onCreateSuccess: function (oContext) {
			// show success message
			var sMessage = this.getResourceBundle().getText("newItemCreated", [oContext.id]);
			MessageToast.show(sMessage, {
				closeOnBrowserNavigation : false
			});
			// navigate to the new item in display mode
			this.getRouter().navTo("object", {
				objectId : oContext.id
			}, true);
		},		

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf zorg.ZOrganizations2.view.ObjectCreate
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf zorg.ZOrganizations2.view.ObjectCreate
		 */
		//	onAfterRendering: function() {
		//
		//	},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf zorg.ZOrganizations2.view.ObjectCreate
		 */
		//	onExit: function() {
		//
		//	},
		onSave:function(oEvent){
			var oData = this.getView().getModel();
			oData.submitChanges();
		},
		onCancel:function(oEvent){
			// discard the new context on cancel
			this.getModel().deleteCreatedEntry(this.oContext);			
		},
		onMessagesButtonPress: function(oEvent) {
			var oMessagesButton = oEvent.getSource();

			if (!this._messagePopover) {
				this._messagePopover = new MessagePopover({
					items: {
						path: "message>/",
						template: new MessagePopoverItem({
							description: "{message>description}",
							type: "{message>type}",
							title: "{message>message}"
						})
					}
				});
				oMessagesButton.addDependent(this._messagePopover);
			}
			this._messagePopover.toggle(oMessagesButton);
		}		

	});

});