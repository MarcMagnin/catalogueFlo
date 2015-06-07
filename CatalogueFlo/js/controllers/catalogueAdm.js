
var Item = function () {
    this.Auteurs = [];
    this.Tags = [];
    this.Image = "";
};

var Update = function () {
    this.Type = "";
    this.Name = "";
};

app.controller("catalogueAdm", function ($scope, $rootScope, $http, $timeout, $q, itemService, $filter, $mdDialog, $upload) {
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

                  console.log(item.Auteurs);

                  item.filter += item.Auteurs.map(function (val) {
                      return 'f-' + cleanString(val);
                  }).join(' ');


                  item.filter += " " + item.Tags.map(function (val) {
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

    $scope.addByDragAndDrop = function ($files, $event, $rejectedFiles) {
        var prom = [];
        angular.forEach($files, function (file, key) {
            var item = new Item;
            //livre.datePublication = moment().format();
            var defer = $q.defer();
            prom.push(defer.promise);
            $scope.addItem(item).success(function (data, status, headers, config) {
                item.Id = data.Key;
                $timeout(function () {
                    $scope.items.unshift(item);
                    $scope.$apply();
                    $("#Container").mixItUp('filter', $scope.searchPattern);
                })

                defer.resolve();
                var fileReader = new FileReader();
                fileReader.onload = function (e) {
                    $upload.http({
                        url: $rootScope.apiRootUrl + '/static/' + item.Id + '/' + file.name,
                        method: "PUT",
                        headers: { 'Content-Type': file.type },
                        data: e.target.result
                    }).progress(function (evt) {
                        // Math.min is to fix IE which reports 200% sometimes
                        //   $scope.progress[index] = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
                        console.log('percent: ' + parseInt(100.0 * evt.loaded / evt.total));
                    }).success(function (data, status, headers, config) {
                        // mise à jour du livre avec l'URI de l'image
                        $scope.setAttachment(file.name, item, 'Image');

                    }).error(function (err) {
                        alert('Error occured during upload');
                    });
                }
                fileReader.readAsArrayBuffer(file);
            }).
            error(function (data, status, headers, config) {
                console.log(data);
            });
        });
        $q.all(prom).finally(function () {
            $scope.sort();
        });

    };
    $scope.setAttachment = function (fileName, item, fieldName) {
        var attachmentUrl = 'static/' + item.Id + '/' + fileName;
        var update = new Update();
        update.Type = 'Set';
        update.Name = fieldName;
        update.Value = attachmentUrl;
        $http({
            method: 'PATCH',
            headers: { 'Raven-Entity-Name': $scope.entityName },
            url: $rootScope.apiRootUrl + '/docs/' + item.Id,
            data: angular.toJson(new Array(update))
        }).
            success(function (data, status, headers, config) {
                item[fieldName] = attachmentUrl;
                console.log(fieldName)
            }).
            error(function (data, status, headers, config) {
                console.log(data);
            });
    };

    $scope.addItem = function (item) {
        return $http({
            method: 'PUT',
            headers: { 'Raven-Entity-Name': $scope.entityName },
            url: $rootScope.apiRootUrl + '/docs/' + $scope.entityName + '%2F',
            data: angular.toJson(item)
        })
    }
    $scope.add = function ($event) {
        var item = new Item;
        $scope.selectedItem = item;
        $scope.addItem(item).success(function (data, status, headers, config) {
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

            var aim = ""

            if ($scope.searchedText.Val) {
                var aim = $scope.searchedText.Val;
            } else if ($scope.searchedText) {
                aim = $scope.searchedText;
            }
            if (aim) {
                $scope.searchPatternRecherche = aim.split(" ").map(function (val) {
                    return '[class*=\'f-' + cleanString(val) + '\']';
                }).join('');
            }
            else {
                $scope.searchPatternRecherche = "";
            }

            $scope.validateFilter();
        }, 300);
    }


    $scope.validateFilter = function () {
        var searchPattern = ($scope.searchPatternRecherche ? $scope.searchPatternRecherche : '')
        if (searchPattern.length == 0)
            $scope.searchPattern = "*"
        else {
            $scope.searchPattern = searchPattern;
        }
        console.log("Search" + $scope.searchPattern)
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
