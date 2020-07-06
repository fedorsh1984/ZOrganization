sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/m/MessageToast",
	"sap/ui/core/Fragment"
], function (BaseController, JSONModel, formatter,MessageToast,Fragment) {
	"use strict";

	return BaseController.extend("zorg.ZOrganizations2.controller.Object", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit : function () {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var iOriginalBusyDelay,
				oViewModel = new JSONModel({
					busy : true,
					delay : 0
				});

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

			// Store original busy indicator delay, so it can be restored later on
			iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
			this.setModel(oViewModel, "objectView");
			this.getOwnerComponent().getModel().metadataLoaded().then(function () {
					// Restore original busy indicator delay for the object view
					oViewModel.setProperty("/delay", iOriginalBusyDelay);
				}
			);
			// Set the initial form to be the display one
			this._showFormFragment("Display");
			this._toggleButton(false);
		},

		onExit : function () {
			for (var sPropertyName in this._formFragments) {
				if (!this._formFragments.hasOwnProperty(sPropertyName) || this._formFragments[sPropertyName] === null) {
					return;
				}

				this._formFragments[sPropertyName].destroy();
				this._formFragments[sPropertyName] = null;
			}
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler when the share in JAM button has been clicked
		 * @public
		 */
		onShareInJamPress : function () {
			var oViewModel = this.getModel("objectView"),
				oShareDialog = sap.ui.getCore().createComponent({
					name: "sap.collaboration.components.fiori.sharing.dialog",
					settings: {
						object:{
							id: location.href,
							share: oViewModel.getProperty("/shareOnJamTitle")
						}
					}
				});
			oShareDialog.open();
		},
		

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched : function (oEvent) {
			var sObjectId =  oEvent.getParameter("arguments").objectId;
			this.getModel().metadataLoaded().then( function() {
				var sObjectPath = this.getModel().createKey("zord_organiz_cds", {
					id :  sObjectId
				});
				this._bindView("/" + sObjectPath);
			}.bind(this));
		},

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound
		 * @private
		 */
		_bindView : function (sObjectPath) {
			var oViewModel = this.getModel("objectView"),
				oDataModel = this.getModel();

			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function () {
						oDataModel.metadataLoaded().then(function () {
							// Busy indicator on view should only be set if metadata is loaded,
							// otherwise there may be two busy indications next to each other on the
							// screen. This happens because route matched handler already calls '_bindView'
							// while metadata is loaded.
							oViewModel.setProperty("/busy", true);
						});
					},
					dataReceived: function () {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		_onBindingChange : function () {
			var oView = this.getView(),
				oViewModel = this.getModel("objectView"),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("objectNotFound");
				return;
			}

			var oResourceBundle = this.getResourceBundle(),
				oObject = oView.getBindingContext().getObject(),
				sObjectId = oObject.id,
				sObjectName = oObject.name;

			oViewModel.setProperty("/busy", false);
			// Add the object page to the flp routing history
			this.addHistoryEntry({
				title: this.getResourceBundle().getText("objectTitle") + " - " + sObjectName,
				icon: "sap-icon://enter-more",
				intent: "#Organizations-display&/zord_organiz_cds/" + sObjectId
			});

			oViewModel.setProperty("/saveAsTileTitle", oResourceBundle.getText("saveAsTileTitle", [sObjectName]));
			oViewModel.setProperty("/shareOnJamTitle", sObjectName);
			oViewModel.setProperty("/shareSendEmailSubject",
			oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
			oViewModel.setProperty("/shareSendEmailMessage",
			oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
		},
		
		_formFragments: {},
		
		_getFormFragment: function (sFragmentName) {
			debugger;
			var oFormFragment = this._formFragments[sFragmentName];

			if (oFormFragment) {
				return oFormFragment;
			}
			Fragment.load({
					id: this.getView().getId(),
					name: "zorg.ZOrganizations2.view.fragment." + sFragmentName
				}).then(function (oFormFragment) {
					debugger;
					// connect dialog to the root view of this component (models, lifecycle)
					this._formFragments[sFragmentName] = oFormFragment;
					var oPage = this.byId("page");
					oPage.setContent(this._formFragments[sFragmentName]);	
				}.bind(this));
			
			// oFormFragment = sap.ui.xmlfragment(this.getView().getId(), "zorg.ZOrganizations2.view.fragment." + sFragmentName);

			// this._formFragments[sFragmentName] = oFormFragment;
			// return this._formFragments[sFragmentName];
		},		
		_showFormFragment:function(sFragmentName){
			debugger;
			var oPage = this.byId("page");
			
			var oCont = oPage.getContent();
			if (oCont){
				debugger;
	            for(var sPropertyName in this._formFragments) {
	                if(this._formFragments.hasOwnProperty(sPropertyName)) {
	                	if (this._formFragments[sPropertyName]){
			                this._formFragments[sPropertyName].destroy();
			                this._formFragments[sPropertyName] = null;
	                	}
	                }
	            }
	        	oPage.destroyContent();	    
			}	
			this._getFormFragment(sFragmentName);
			//oPage.setContent(this._getFormFragment(sFragmentName));		
		},
		
		_toggleButtonsAndView : function (bEdit) {
			var oView = this.getView();
			this._toggleButton(bEdit);
			// Set the right form type
			// debugger;
			this._showFormFragment(bEdit ? "Change" : "Display");
		},
		_toggleButton:function(bEdit){
			var oPage = this.byId("page");
			oPage.getEditAction().setVisible(!bEdit);
			var oFooter = oPage.getFooterCustomActions();
			oFooter.forEach((item, index) => item.setVisible(bEdit));
			oPage.setShowFooter(bEdit);
		},
		
		onPressEdit:function(oEvent){
			debugger;
			this._toggleButtonsAndView(true);
		},
		
		onSave:function(oEvent){
			this.getModel().submitChanges({
				success: function(oData, sResponse) {
					MessageToast.show("Data saved");
					this.getView().getModel().refresh(true);
				}.bind(this),
				error: function(oError) {
					MessageToast.show("Save error");
				}.bind(this)
			})
			this._toggleButtonsAndView(false);
		},
		
		onCancel:function(oEvent){
			this.getModel().resetChanges();
			this._toggleButtonsAndView(false);
		},
		
		onDeleteEdit:function(oEvent){
			debugger;
			this.getModel().remove( oEvent.oSource.getBindingContext().getPath(),
				{
				success: function(oData, sResponse) {
					MessageToast.show("Data deleted");
					//this.getView().getModel().refresh(true);
					this.getRouter().navTo("worklist");
				}.bind(this),
				error: function(oError) {
					MessageToast.show("Data was not deleted");
				}.bind(this)
				});
		},
		
		onNavBack: function() {
			var oHistory = sap.ui.core.routing.History.getInstance(),
				sPreviousHash = oHistory.getPreviousHash(),
				oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

			this.byId("page").destroyContent();

			if (sPreviousHash !== undefined || !oCrossAppNavigator.isInitialNavigation()) {
				history.go(-1);
			} else {
				oCrossAppNavigator.toExternal({
					target: {
						shellHash: "#"
					}
				});
			}
		}		
		
	});

});