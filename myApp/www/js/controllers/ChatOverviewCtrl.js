.controller('ChatOverviewCtrl', function($scope, $firebase, localstorage, UserInfo) {

    $scope.currentUser = localstorage.getObject('userData');
    var sync = $firebase(new Firebase("https://huggr.firebaseio.com/users/data/" + $scope.currentUser.profileID + "/chat/"));
    $scope.chatList = sync.$asArray();

    $scope.chatResults = [];

    $scope.chatList.$loaded().then(function() {
        for (var i = 0; i < ($scope.chatList).length; i++) {
        	                                console.log($scope.chatList[i].otherProfileID);

            UserInfo.getProfile($scope.chatList[i].otherProfileID).then(function(value) {
                                console.log(value);

            });
        };

    });



})