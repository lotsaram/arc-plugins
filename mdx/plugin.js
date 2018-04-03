
arc.run(['$rootScope', function($rootScope) {

    $rootScope.plugin("cubewiseMdx", "MDX", "page", {
        menu: "tools",
        icon: "fa-table",
        description: "This plugin can be used to test MDX queries.",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "1.0.0"
    });

}]);

arc.directive("cubewiseMdx", function () {
    return {
        restrict: "EA",
        replace: true,
        scope: {
            instance: "=tm1Instance"  
        },
        templateUrl: "__/plugins/mdx/template.html",
        link: function ($scope, element, attrs) {

        },
        controller: ["$scope", "$rootScope", "$http", "$tm1", "$translate", function ($scope, $rootScope, $http, $tm1, $translate) {        

            // Create the tabs
            $scope.tabs = [];
            // Store the active tab index
            $scope.activeTab = 0;
            $scope.queryCounter = 0;

            $scope.addTab = function(){
                // Add a tab
                $scope.queryCounter++;
                $scope.tabs.push({
                    name: $translate.instant("QUERY") + " " + $scope.queryCounter,
                    mdx: "SELECT \n"
                        + "\tNON EMPTY {[Version].[Actual], [Version].[Budget]} ON COLUMNS, \n"
                        + "\tNON EMPTY {TM1SUBSETALL([Account])} ON ROWS \n"
                        + "FROM [General Ledger] \n"
                        + "WHERE ([Department].[Corporate], [Year].[2012])"
                });
            };

            // Add the initial tab
            $scope.addTab();

            $scope.closeTab = function(index){
                // Remove a tab
                $scope.tabs.splice(index, 1);
            };

            $scope.tabSelected = function(){
                // This is required to resize the MDX panel after clicking on a tab
                $scope.$broadcast("auto-height-resize");
            };

            $scope.toggleQuery = function(tab){
                // Show and hide the query tab
                tab.hideQuery = !tab.hideQuery;
                $scope.$broadcast("auto-height-resize");
            };

            $scope.editorLoaded = function(_editor){
                // Initialise the editor settings
                _editor.setTheme($rootScope.uiPrefs.editorTheme);
                _editor.getSession().setMode("ace/mode/mdx");
                _editor.getSession().setOptions({ tabSize: $rootScope.uiPrefs.editorTabSpaces, useSoftTabs: true });
                _editor.$blockScrolling = Infinity;
                _editor.setFontSize($rootScope.uiPrefs.fontSize);
                _editor.setShowPrintMargin(false);
                // Set the content of the editor using the active tab
                _editor.setValue($scope.tabs[$scope.activeTab].mdx, -1);
            };

            $scope.editorChanged = function(args){
                // First argument is the change, the second is a reference to the editor
                $scope.tabs[$scope.activeTab].mdx = args[1].getValue();
            };

            $scope.execute = function(){
                var tab = $scope.tabs[$scope.activeTab];
                tab.result = null;
                tab.executing = true;
                $scope.message = null;
                var args = "$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($expand=Members($select=Name,UniqueName,Ordinal,Attributes))),Cells($select=Ordinal,Status,Value,FormatString,FormattedValue,Updateable,RuleDerived,Annotated,Consolidated,Language,HasDrillthrough)"
                $http.post(encodeURIComponent($scope.instance) +"/ExecuteMDX?" + args, {MDX: tab.mdx}).then(function(success){
                    tab.executing = false;
                    if(success.status == 401){
                        return;
                    } else if (success.status >= 400){
                        // Error
                        $scope.message = success.data;
                        if(success.data.error && success.data.error.message){
                            $scope.message = success.data.error.message;
                        }
                    } else {
                        // Success
                        var regex = /FROM\s\[(.*)\]/g;
                        var match = regex.exec(tab.mdx);
                        var cube = match[1];
                        tab.result = {
                            json: success.data,
                            table: $tm1.resultsetTransform($scope.instance, cube, success.data)
                        }
                        
                    }
                });
            };

            $scope.$on("login-reload", function(event, args) {
                
            });
                
            $scope.$on("close-tab", function(event, args) {
                // Event to capture when a user has clicked close on the tab
                if(args.page == "cubewiseMdx" && args.instance == $scope.instance && args.name == null){
                    // The page matches this one so close it
                    $rootScope.close(args.page, {instance: $scope.instance});
                }
            });

            $scope.$on("$destroy", function(event){
   
            });
        

        }]
    };
});