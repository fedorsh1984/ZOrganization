sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	'sap/m/Token'
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, Token) {
	"use strict";

	return BaseController.extend("zorg.ZOrganizations2.controller.Worklist", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit : function () {
			var oViewModel,
				iOriginalBusyDelay;
				
			this.oTable = this.byId("table");

			// Put down worklist table's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the table is
			// taken care of by the table itself.
			iOriginalBusyDelay = this.oTable.getBusyIndicatorDelay();
			// keeps the search state
			this._aTableSearchState = [];

			// Model used to manipulate control states
			oViewModel = new JSONModel({
				worklistTableTitle : this.getResourceBundle().getText("worklistTableTitle"),
				saveAsTileTitle: this.getResourceBundle().getText("saveAsTileTitle", this.getResourceBundle().getText("worklistViewTitle")),
				shareOnJamTitle: this.getResourceBundle().getText("worklistTitle"),
				shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
				shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
				tableNoDataText : this.getResourceBundle().getText("tableNoDataText"),
				tableBusyDelay : 0
			});
			this.setModel(oViewModel, "worklistView");
			oViewModel.setProperty("/titleSnappedContent", "Filtered by None");
			
			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			this.oTable.attachEventOnce("updateFinished", function(){
				// Restore original busy indicator delay for worklist's table
				oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
			});
			// Add the worklist page to the flp routing history
			this.addHistoryEntry({
				title: this.getResourceBundle().getText("worklistViewTitle"),
				icon: "sap-icon://table-view",
				intent: "#Organizations-display"
			}, true);
			
			this.aFilterKeys = [
				"name"
				,"inn"
			];
			this.oSelectOrganiz = this.byId("srchOrganization");
			this.oSelectINN = this.byId("srchINN");
			var oFB = this.getView().byId("filterbar");
			if (oFB) {
				oFB.variantsInitialized();
			}
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Triggered by the table's 'updateFinished' event: after new table
		 * data is available, this handler method updates the table counter.
		 * This should only happen if the update was successful, which is
		 * why this handler is attached to 'updateFinished' and not to the
		 * table's list binding's 'dataReceived' method.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished : function (oEvent) {
			// update the worklist's object counter after the table update
			var sTitle,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
			// only update the counter if the length is final and
			// the table is not empty
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
			} else {
				sTitle = this.getResourceBundle().getText("worklistTableTitle");
			}
			this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
		},

		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
		onPress : function (oEvent) {
			// The source is the list item that got pressed
			this._showObject(oEvent.getSource());
		},


		/**
		 * Event handler when the share in JAM button has been clicked
		 * @public
		 */
		onShareInJamPress : function () {
			var oViewModel = this.getModel("worklistView"),
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

		onSearch : function (oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
			} else {
				var aTableSearchState = [];
				var sQuery = oEvent.getParameter("query");

				if (sQuery && sQuery.length > 0) {
					aTableSearchState = [new Filter("name", FilterOperator.Contains, sQuery)];
				}
				this._applySearch(aTableSearchState);
			}

		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh : function () {
			var oTable = this.byId("table");
			oTable.getBinding("items").refresh();
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Shows the selected item on the object page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showObject : function (oItem) {
			this.getRouter().navTo("object", {
				objectId: oItem.getBindingContext().getProperty("id")
			});
		},

		_filterTable:function(aCurrentFilterValues)
		{
			// var oTable = this.byId("table");
			// oViewModel = this.getModel("worklistView");
			var aFilter = [];
			aFilter = this._getFilters(aCurrentFilterValues);
			this._applySearch(aFilter);
			this.getModel("worklistView").setProperty("/titleSnappedContent", this._getFormattedSummaryText(aCurrentFilterValues) );
			// oTable.getBinding("items").filter(this.getFilters(aCurrentFilterValues), "Application");
			// this.getTableItems().filter(this.getFilters(aCurrentFilterValues), "Application");
			// if (aTableSearchState.length !== 0) {
			// 	oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
			// }			
			// this.updateFilterCriterias(this.getFilterCriteria(aCurrentFilterValues));			
		},
		

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
		 * @private
		 */
		_applySearch: function(aTableSearchState) {
			var oViewModel = this.getModel("worklistView");
			this.getTableItems().filter(aTableSearchState, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aTableSearchState.length !== 0) {
				oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
			}
		},
		// ** Filter functions
		onFilterSubmit: function(oEvent){
			var aCurrentFilterValues = [];
			aCurrentFilterValues.push(this.oSelectOrganiz.getValue() );
			aCurrentFilterValues.push(this.oSelectINN.getValue() );
			this._filterTable(aCurrentFilterValues);			
		},

		getTableItems:function()
		{
			return this.oTable.getBinding("items");
		},
		_getFilters: function(aCurrentFilterValues) {
		    var aFilters = [];
			aFilters = this.aFilterKeys.reduce(function(result,element, i) {
				if (aCurrentFilterValues[i] !== "")
				{
					result.push( new Filter(element, sap.ui.model.FilterOperator.Contains, aCurrentFilterValues[i]) );
				}
				return result;
			}, []);
			return aFilters;
			
		},
		_getFormattedSummaryText: function(aFilterCriterias) {
			if (aFilterCriterias.length > 0) {
				var aFilter = aFilterCriterias.filter(filter => filter !== '' );
				return "Filtered By (" + aFilter.length + "): " + aFilter.join(", ");
			} else {
				return "Filtered by None";
			}
		},
		onValueHelpRequested: function(){
			
			this._oVHOrg = sap.ui.xmlfragment("zorg.ZOrganizations2.view.fragment.VHOrganization", this);
			this.getView().addDependent(this._oVHOrg);

			this._oVHOrg.getTableAsync().then(function (oTable) {
				oTable.setModel(this.getModel());

				var oColModel = new sap.ui.model.json.JSONModel();
				    oColModel.setData({
				        cols: [
								 {label: "ID", template: "id"},
				                 {label: "NAME", template: "name"}
				            ]
				    });
				    
				oTable.setModel(oColModel, "columns")    
				var aCols = oColModel.getData().cols;
				if (oTable.bindRows) {
					oTable.bindAggregation("rows", "/zord_organiz_cds");
				}

				if (oTable.bindItems) {
					oTable.bindAggregation("items", "/zord_organiz_cds", function () {
						return new ColumnListItem({
							cells: aCols.map(function (column) {
								return new Label({ text: "{" + column.template + "}" });
							})
						});
					});
				}
				this._oVHOrg.update();
			}.bind(this));

			var oToken = new Token();
			oToken.setKey(this.oSelectOrganiz.getSelectedKey());
			oToken.setText(this.oSelectOrganiz.getValue());
			this._oVHOrg.setTokens([oToken]);
			this._oVHOrg.open();			
		},
		onValueHelpOkPress: function (oEvent) {
			var aTokens = oEvent.getParameter("tokens");
			this.oSelectOrganiz.setSelectedKey(aTokens[0].getKey());
			this._oVHOrg.close();
		},

		onValueHelpCancelPress: function () {
			this._oVHOrg.close();
		},

		onValueHelpAfterClose: function () {
			this._oVHOrg.destroy();
		},
		
		onValueHelpRequestedINN: function() {
			
			var oInputVHINN = sap.ui.getCore().byId("INN");
		    if(!this._oVHINN){
		        this._oVHINN = new sap.ui.comp.valuehelpdialog.ValueHelpDialog("idValueHelp",{
		        supportMultiselect: false,
		        supportRangesOnly: false, 
		        stretch: sap.ui.Device.system.phone,
		        key: "inn",
		        descriptionKey: "name",
		        filtermode: "true",
		        ok: function(oEvent){
		            var aTokens = oEvent.getParameter("tokens");
		            this.oSelectINN.setSelectedKey(aTokens[0].getKey());
		            this._oVHINN.close();
		        }.bind(this),
		        cancel: function(){
		            this._oVHINN.close();
		        }.bind(this),
		        afterClose:function(){
		        	this._oVHINN.destroy();
		        	this._oVHINN = undefined;
		        }.bind(this)
		        });
		    }
		    
			this._oVHINN.getTableAsync().then(function (oTable) {
				oTable.setModel(this.getModel());

				var oColModel = new sap.ui.model.json.JSONModel();
				    oColModel.setData({
				        cols: [
								 {label: "ID", template: "id"},
				                 {label: "NAME", template: "name"},
				                 {label: "INN", template: "inn"}
				            ]
				    });
				    
				oTable.setModel(oColModel, "columns")    
				var aCols = oColModel.getData().cols;
				if (oTable.bindRows) {
					oTable.bindAggregation("rows", {path:"/zord_organiz_cds", 
						filters:[new sap.ui.model.Filter( "id",sap.ui.model.FilterOperator.EQ, this.oSelectOrganiz.getSelectedKey() )]
					});
				// 	filters:  [
    // new sap.ui.model.Filter( "Orderid",sap.ui.model.FilterOperator.EQ, iOrder ),
					
				}

				if (oTable.bindItems) {
					oTable.bindAggregation("items", "/zord_organiz_cds", function () {
						return new ColumnListItem({
							cells: aCols.map(function (column) {
								return new Label({ text: "{" + column.template + "}" });
							})
						});
					});
				}
				this._oVHINN.update();
			}.bind(this));

			var oToken = new Token();
			oToken.setKey(this.oSelectINN.getSelectedKey());
			oToken.setText(this.oSelectINN.getValue());
			this._oVHINN.setTokens([oToken]);
			this._oVHINN.open();			    
			
		},
		onAddNew: function (Event) {
			debugger;
			//this.getRouter().navTo("objectcreatet", { });
			
			this.getRouter().navTo("objectcreate");
			
			// var oData = this.getView().getModel();
			
		 //   var oNewEntry = oData.createEntry('/zord_organiz_cds', 
		 //   	{
			// 		properties: {
			// 		"name" : "Joz2",
			// 	    "long_name" : "Sozuvelt",
			// 	    "address" : "Moscow",
			// 	    "director" : "Annush",
			// 	    "inn" : "111111111111"
			// 		},
					
			// 		success:function(){
			// 			debugger;
			// 		},
			// 		error:function(){
			// 			debugger;	
			// 		}
			// 	} );
			// var lisItemForTable = this.getView().byId("listItemForTable").clone();
			// lisItemForTable.setBindingContext(oNewEntry);
			// var otable = this.getView().byId("table");
			// // otable.addItem(lisItemForTable);
			// oData.submitChanges();
			// // this._showObject(lisItemForTable);
			
		}

	});
});