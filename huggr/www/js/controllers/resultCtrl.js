.controller('resultCtrl', function($scope, Auth, $firebase, $stateParams, localstorage, $cordovaGeolocation, $q, $ionicLoading, $http, $state, toast, huggActions, $ionicModal) {

        //initialize all the stuff
        $scope.auth = Auth;
        $scope.user = $scope.auth.$getAuth();
        var ref = new Firebase("https://huggr.firebaseio.com/");
        $scope.huggRef = $firebase(ref.child("hugg")).$asArray();
        $scope.currentUser = localstorage.getObject('userData');
        //displays all huggs that suit the request
        //if huggs are not answered, they are also not done or accepted
        $scope.orderHuggRef = $firebase(ref.child("hugg").orderByChild('answered').equalTo(0).limitToFirst(100)).$asArray();

        var gender;
        var range;

        //checks what gender is filtered on
        if ($stateParams.female == "none" && $stateParams.male == "true") {
            gender = "male";
        }
        if ($stateParams.male == "none" && $stateParams.female == "true") {
            gender = "female";
        }
        if (($stateParams.male == "none" && $stateParams.female == "none") || ($stateParams.male == "true" && $stateParams.female == "true")) {
            gender = "both";
        }

        $ionicModal.fromTemplateUrl('templates/modals/googleMaps.html', {
            scope: $scope
        }).then(function(modal) {
            $scope.gmapsModal = modal;
        });

        $scope.modalData = {};
        $scope.$on('mapInitialized', function(event, map) {
            $scope.map = map;
        });

        $scope.showPosition = function(lat, long) {
            $scope.modalData.lat = lat;
            $scope.modalData.long = long;
            $scope.gmapsModal.show();
            $cordovaGeolocation.getCurrentPosition().then(function(position) {
                //wandle in google Maps format um
                var pos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                $scope.modalData.userlat = pos.k;
                $scope.modalData.userlong = pos.D;
            }, function(err) {
                toast.pop("There was an error while we tried to locate you.");
            });

        }

        range = $stateParams.range;

        $scope.answerHugg = function(huggID, profileID) {
            huggActions.answerHugg(huggID, $scope.currentUser, profileID);
        }

        $scope.requestHugg = function(huggID, profileID) {
            huggActions.requestHugg($scope.currentUser, gender);
        }

        //initialize JSON
        var huggArray = {
            hugg: []
        }

        //start values
        var currentLat = 49.472726;
        var currentLong = 8.449496;

        //wait for ref to load before continuing
        function getHuggs() {
                var deferred = $q.defer();

                $scope.orderHuggRef.$loaded().then(function(data) {
                    var i = 0;
                    //get GPS locaion
                    $cordovaGeolocation
                        .getCurrentPosition()
                        .then(function(position) {

                            //save coordinates to var
                            currentLat = position.coords.latitude;
                            curentLong = position.coords.longitude;

                            //parse all elements of returning array
                            while (data.$keyAt(i) != null) {

                                function load() {
                                    var def = $q.defer();
                                    def.resolve(data.$getRecord(data.$keyAt(i)));
                                    return def.promise
                                }; //end function
                                //check whether filter gender of searching person and gender of requestor match
                                //check whether gender of searching person and filter of requestor match
                                //check whether current user's profile ID is among the blocked profile IDs
                                load().then(function(record) {
                                    if (((gender == "both") || (gender != "both" && record.reqGender == gender)) && ((record.FilterGender == "both") || (record.FilterGender != "both" && record.FilterGender == $scope.currentUser.gender)) && (record.reqProfileID != $scope.currentUser.profileID)) {

                                        $scope.huggRef = $firebase(ref.child("hugg").child(record.huggID).child("blocked")).$asArray();
                                        $scope.huggRef.$loaded().then(function(data) {

                                            //check whether user is blocked in results                            
                                            if (data.$getRecord($scope.currentUser.profileID) == null) {

                                                //calc distance
                                                var radius = 6371;
                                                var diffLat = (currentLat - record.reqLat) * (Math.PI / 180);
                                                var diffLon = (currentLong - record.reqLong) * (Math.PI / 180);
                                                var a =
                                                    Math.sin(diffLat / 2) * Math.sin(diffLat / 2) +
                                                    Math.cos((record.reqLat) * (Math.PI / 180)) * Math.cos((currentLat) * (Math.PI / 180)) *
                                                    Math.sin(diffLon / 2) * Math.sin(diffLon / 2);
                                                var b = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                                                var distance = radius * b;

                                                //check for distance within range and save to JSON
                                                if (distance <= range) {
                                                    huggArray.hugg.push({
                                                        "huggID": record.huggID,
                                                        "firstName": record.reqFirstName,
                                                        "gender": record.reqGender,
                                                        "lat": record.reqLat,
                                                        "long": record.reqLong,
                                                        "reqTime": record.reqTime,
                                                        "picture": record.reqPicture,
                                                        "profileID": record.reqProfileID,
                                                        "distance": distance,
                                                        "rating": record.reqRating
                                                    }); //end push
                                                } // end if

                                            } //end if
                                        }); //end then
                                    } // end if
                                }); //end then
                                i++;
                            } //end while
                            deferred.resolve(huggArray);
                        }); //end GPS then

                    //This is the return value
                }); //end load huggRef
                return deferred.promise;
            } //end function

        getHuggs().then(function(array) {
            $scope.resultList = array;
        });

    }) //end resultCTRL
