
var Item = function () {
    this.Auteurs = [];
    this.Tags = [];
    this.Image = "";
};

var Update = function () {
    this.Type = "";
    this.Name = "";
};

app.controller("catalogueAdm", function ($scope, $rootScope, $http, $timeout, $q, itemService, $filter, $mdDialog) {
    //$rootScope.apiRootUrl = "http://62.23.104.30:8181/databases/catalogueFlo";
    $rootScope.apiRootUrl = "http://localhost:8088/databases/catalogueFlo";

    $scope.entityName = "Item"
    $scope.items = [];
    $scope.tags = [];
    $scope.searchPattern = "*";


    $scope.init = function () {
        itemAdded = 0;


        itemService.get()
          .then(function (items) {

              var $container = $('#Container');
              if ($container.mixItUp('isLoaded')) {
                  $container.mixItUp('destroy')
              }
              delayLoop(items, 0, 0, function (item) {
                  item.filter = "";
                  item.Id = item['@metadata']['@id'];


                  item.filter += item.Auteurs.map(function (val) {
                      return 'f-' + cleanString(val);
                  }).join(' ');


                  item.filter += " "+ item.Tags.map(function (val) {
                      return 'f-' + cleanString(val);
                  }).join(' ');

                  $scope.items.push(item);
                  if ($scope.items.length == 23) {
                      $scope.$apply();
                      if (!$container.mixItUp('isLoaded')) {
                          $container.mixItUp({ animation: { enable: enableAnimation } });
                      }
                  }

                  if ($scope.items.length % 30 == 0) {
                      $scope.$apply();
                      if ($container.mixItUp('isLoaded')) {
                          $container.mixItUp('filter', $scope.searchPattern);
                      }
                  }


                  if ($scope.items.length == items.length) {

                      $scope.$apply();
                      $scope.dataReady = true;
                      if (!$container.mixItUp('isLoaded')) {
                          $container.mixItUp({ animation: { enable: enableAnimation } });
                      } else {
                          $container.mixItUp('filter', $scope.searchPattern);
                      }
                  }
              });
          })
    };


    $scope.delete = function (item, $event) {
        if ($event) {
            $event.stopPropagation();
            $event.stopImmediatePropagation();
        }

        $scope.removeAttachment(item, 'Image');

        $http({
            method: 'DELETE',
            headers: { 'Raven-Entity-Name': $scope.entityName },
            url: $rootScope.apiRootUrl + '/docs/' + item.Id,
        }).
          success(function (data, status, headers, config) {
              $scope.items.splice($scope.items.indexOf(item), 1);
          }).
          error(function (data, status, headers, config) {
              console.log(data);
          });
    };

    $scope.removeAttachment = function (item, field) {
        if (item[field]) {
            $http({
                method: 'DELETE',
                url: $rootScope.apiRootUrl + '/' + item[field]
            }).
              //success(function (data, status, headers, config) {
              //}).
              error(function (data, status, headers, config) {
                  console.log(data);
              });
        }
    }

    $scope.select = function (item, $event) {
        $scope.selectedItem = item;
        $mdDialog.show({
            targetEvent: $event,
            templateUrl: 'itemModal.tmpl.html',
            controller: 'itemModalController',
            //onComplete: afterShowItemDialog,
            locals: {
                selectedItem: $scope.selectedItem,
                parentScope: $scope
            }
        })
    }
    $scope.add = function ($event) {
        var item = new Item;
        $scope.selectedItem = item;
        $http({
            method: 'PUT',
            headers: { 'Raven-Entity-Name': $scope.entityName },
            url: $rootScope.apiRootUrl + '/docs/' + $scope.entityName + '%2F',
            data: angular.toJson(item)
        }).success(function (data, status, headers, config) {
            item.Id = data.Key;
            $mdDialog.show({
                targetEvent: $event,
                templateUrl: 'itemModal.tmpl.html',
                controller: 'itemModalController',
                //onComplete: afterShowItemDialog,
                locals: {
                    selectedItem: $scope.selectedItem,
                    parentScope: $scope
                }
            })
            //    .finally(function () {
            //    alert("close");
            //});

            $timeout(function () {
                $scope.items.unshift($scope.selectedItem);
                $scope.$apply();
                $("#Container").mixItUp('filter', $scope.searchPattern);
            })
            
            //$("#Container").mixItUp('append', $('.tile'));

        }).
        error(function (data, status, headers, config) {
            console.log(data);
        });



    }

    $scope.validateSearch = function (keyEvent) {
        if ($scope.searchTimeout) {
            clearTimeout($scope.searchTimeout);
        }

        $scope.searchTimeout = setTimeout(function () {
            var searchPattern;
            if ($scope.searchedText.Titre) {

                $scope.searchPatternRecherche = $scope.searchedText.Titre.split(" ").map(function (val) {
                    return '[class*=\'f-' + cleanString(val) + '\']';
                }).join('');

                console.log($scope.searchPatternRecherche)
            } else {
                $scope.searchPatternRecherche = $scope.searchedText.split(" ").map(function (val) {
                    return '[class*=\'f-' + cleanString(val) + '\']';
                }).join('');
            }

            $scope.validateFilter();
        }, 300);
    }


    $scope.validateFilter = function () {
        var searchPattern =  ($scope.searchPatternRecherche ? $scope.searchPatternRecherche : '')
        if (searchPattern.length == 0)
            $scope.searchPattern = "*"
        else {
            $scope.searchPattern = searchPattern;
        }
        filter();
    }

    function filter() {
        if (!$('#Container').mixItUp('isLoaded')) {
            return;
        }
        if ($('#Container').mixItUp('isMixing')) {
            setTimeout(function () {
                filter();
            }, 200);
        } else {
            var state = $('#Container').mixItUp('getState');
            if (state.activeFilter != $scope.searchPattern) {
                $('#Container').mixItUp('filter', $scope.searchPattern);
            } else {
                // skip filter
            }
        }
    }


    $scope.searchSuggestionsValue;
    $scope.searchSuggestions = function (value) {
        $scope.searchSuggestionsValue = value;
        $scope.loadingSearchSuggestions = true;
        return $http({
            method: 'GET',
            url: $rootScope.apiRootUrl + '/indexes/SearchSuggestions',
            params: {
                query: "Val:" + value + "*",
                pageSize: 10,
                _: Date.now(),
            }
        }).then(function (res) {
            $scope.loadingSearchSuggestions = false;
            res.data.Results.forEach(function (item) {
                item.imageUrl = $scope.apiRootUrl + "/" + item.Couverture;
            });
            return res.data.Results;
        });
    }
    $scope.validateSearchFromLivre = function ($item, $model, $label) {
        if ($item.Auteur && $item.Auteur.Nom.toLowerCase().indexOf($scope.searchSuggestionsValue.toLowerCase()) > -1 || $item.Auteur.Prenom.toLowerCase().indexOf($scope.searchSuggestionsValue.toLowerCase()) > -1) {
            $scope.searchedText = $item.Auteur.Prenom + " " + $item.Auteur.Nom;
        }
    }
});
