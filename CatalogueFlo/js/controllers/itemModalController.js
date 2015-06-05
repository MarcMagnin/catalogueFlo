app.controller('itemModalController', function ($scope,$rootScope,$http, $upload, $mdDialog, selectedItem, parentScope) {
    // Assigned from construction <code>locals</code> options...
    $scope.parentScope = parentScope;
    $scope.selectedItem = selectedItem;

    $scope.closeDialog = function () {
        // Easily hides most recent dialog shown...
        // no specific instance reference is needed.
        $mdDialog.hide();
    };

    $scope.modalMouseWheel = function (event) {
        event.stopPropagation();
    }



    $scope.updateAttachment = function ($files, $event, fieldName) {
         var item = $scope.selectedItem;
         $scope.parentScope.removeAttachment(item, fieldName);
         var file = $files[0];
         var fileReader = new FileReader();
         fileReader.onload = function (e) {
             $scope.upload =
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
                     $scope.setAttachment(file.name, item, fieldName);

                 }).error(function (err) {
                     alert('Error occured during upload');
                 });
         }
         fileReader.readAsArrayBuffer(file);

     };
    $scope.setAttachment = function (fileName, item, fieldName) {
        var attachmentUrl = 'static/' + item.Id + '/' + fileName;
        var update = new Update();
        update.Type = 'Set';
        update.Name = fieldName;
        update.Value = attachmentUrl;
        $http({
            method: 'PATCH',
            headers: { 'Raven-Entity-Name': $scope.parentScope.entityName },
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
});
