angular.module('starter.controllers', [])

.factory("Auth", ["$firebaseAuth",
    function($firebaseAuth) {
        var ref = new Firebase("https://huggr.firebaseio.com/");
        return $firebaseAuth(ref);
    }
])

//Factory um UserInfos abzurufen
//Usage: UserInfo in den Controller injecten, dann im Code: UserInfo.getProfile(ProfileID);
.factory('UserInfo', ["$firebase",
    function($firebase) {
        var ref = new Firebase("https://huggr.firebaseio.com/users/data");
        var dataRef = $firebase(ref).$asArray();
        return {
            getProfile: function(ID) {
                dataRef.$loaded()
                    .then(function(data) {
                        var record = data.$getRecord(ID);
                        var profileData = {
                            "profileID": record.profileID,
                            "displayName": record.displayName,
                            "email": record.email,
                            "picture": record.picture,
                            "birthdate": record.birthdate,
                            "age": record.age,
                            "hobby": record.hobby,
                            "gender": record.gender,
                            "firstname": record.firstname,
                            "lastname": record.lastname
                        };
                        return profileData;
                        console.log(profileData);
                    })
                    .catch(function(error) {
                        console.error("Error getting UserInfo:", error);
                    });
            }
        };
    }
])
    .factory('helper', [

        function() {
            return {
                calcAge: function(date) {
                    var ageDifMs = Date.now() - date.getTime();
                    var ageDate = new Date(ageDifMs); // miliseconds from epoch
                    return Math.abs(ageDate.getUTCFullYear() - 1970);
                }
            };
        }
    ])

.factory('localstorage', ['$window',
    function($window) {
        return {
            set: function(key, value) {
                $window.localStorage[key] = value;
            },
            get: function(key, defaultValue) {
                return $window.localStorage[key] || defaultValue;
            },
            setObject: function(key, value) {
                $window.localStorage[key] = JSON.stringify(value);
            },
            getObject: function(key) {
                return JSON.parse($window.localStorage[key] || '{}');
            }
        }
    }
])


.controller('loginCtrl', function($scope, $firebase, $ionicModal, Auth, $state, localstorage, $ionicViewService) {

    var ref = new Firebase("https://huggr.firebaseio.com/");
    var sync = $firebase(ref).$asObject();
    $scope.auth = Auth;
    $scope.check = $scope.auth.$getAuth();


    //create child for data
    $scope.dataRef = $firebase(ref.child("users").child("data")).$asArray();


    //create child for google
    $scope.googleRef = $firebase(ref.child("users").child("signin").child("google")).$asArray();
    $scope.facebookRef = $firebase(ref.child("users").child("signin").child("facebook")).$asArray();
    $ionicViewService.nextViewOptions({
        disableBack: true
    });

    $scope.login = function(authProvider) {
        if (authProvider == "google") {

            ref.authWithOAuthPopup("google", function(err, authData) {
                if (authData) {


                    var userSigninIdentifier = authData.google.id;
                    if ($scope.googleRef.$getRecord(userSigninIdentifier) == null) {
                        console.warn("new user, registering...");
                        $scope.register(authProvider, authData);
                    } else {
                        $scope.profileID = $scope.googleRef.$getRecord(userSigninIdentifier).profileID;
                        $firebase(ref.child("users").child("signin").child("google").child(userSigninIdentifier)).$update({
                            token: authData.token,
                            expires: authData.expires,
                            AccessToken: authData.google.accessToken
                        });
                        $firebase(ref.child("users").child("data").child($scope.profileID)).$update({
                            displayName: authData.google.displayName,
                            email: authData.google.email,
                            picture: authData.google.cachedUserProfile.picture
                        });
                        console.log("Logged in as:" + authData.uid);
                        var profileData = $scope.dataRef.$getRecord($scope.profileID);
                        //Store profile Data persistently in local storage for global usage
                        localstorage.setObject("userData", profileData);
                        $state.go('app.home');

                    }
                }
                if (err) {
                    console.log("error");
                }
            }, {
                scope: "email"
            });

        }
        if (authProvider == "facebook") {

            $scope.auth.$authWithOAuthPopup("facebook").then(function(authData) {

                var userSigninIdentifier = authData.facebook.id;
                console.log("userSigninIdentifier:" + userSigninIdentifier);

                //

                if ($scope.facebookRef.$getRecord(userSigninIdentifier) == null) {
                    console.warn("new user, registering...");
                    $scope.register(authProvider, authData);
                } else {
                    $scope.profileID = $scope.facebookRef.$getRecord(userSigninIdentifier).profileID;
                    $firebase(ref.child("users").child("signin").child("facebook").child(userSigninIdentifier)).$update({
                        token: authData.token,
                        expires: authData.expires,
                        AccessToken: authData.facebook.accessToken
                    });
                    $firebase(ref.child("users").child("data").child($scope.profileID)).$update({
                        displayName: authData.facebook.displayName,
                        email: authData.facebook.email,
                        picture: authData.facebook.cachedUserProfile.picture.data.url
                    });
                    console.log("Logged in as:", authData.uid);

                    var profileData = $scope.dataRef.$getRecord($scope.profileID);
                    //Store profile Data persistently in local storage for global usage
                    localstorage.setObject("userData", profileData);
                    $state.go('app.home');
                }
            }).catch(function(error) {
                console.error("Authentication failed facebook:", error);
            });

        }
    };

    $scope.register = function(authProvider, authData) {

        var newProfileID = Math.floor(Math.random() * (9999999999 - 1000000000 + 1) + 1000000000);

        while ($scope.dataRef.$getRecord(newProfileID) != null) {
            newProfileID = Math.floor(Math.random() * (9999999999 - 1000000000 + 1) + 1000000000);
        }

        if (authProvider == "google") {
            //write authentification data into database
            $firebase(ref.child("users").child("signin").child("google").child(authData.google.id)).$set({
                displayName: authData.google.displayName,
                token: authData.token,
                expires: authData.expires,
                uid: authData.uid,
                ID: authData.google.id,
                AccessToken: authData.google.accessToken,
                profileID: newProfileID
            });
            $firebase(ref.child("users").child("data").child(newProfileID)).$set({
                profileID: newProfileID,
                googleID: authData.google.id,
                displayName: authData.google.displayName,
                email: authData.google.email,
                picture: authData.google.cachedUserProfile.picture,
                gender: authData.google.cachedUserProfile.gender,
                firstname: authData.google.cachedUserProfile.given_name,
                lastname: authData.google.cachedUserProfile.family_name
            });
        }
        if (authProvider == "facebook") {
            //write authentification data into database
            $firebase(ref.child("users").child("signin").child("facebook").child(authData.facebook.id)).$set({
                displayName: authData.facebook.displayName,
                token: authData.token,
                expires: authData.expires,
                uid: authData.uid,
                ID: authData.facebook.id,
                AccessToken: authData.facebook.accessToken,
                profileID: newProfileID
            });
            $firebase(ref.child("users").child("data").child(newProfileID)).$set({
                profileID: newProfileID,
                googleID: null,
                facebookID: authData.facebook.id,
                displayName: authData.facebook.displayName,
                email: authData.facebook.email,
                picture: authData.facebook.cachedUserProfile.picture.data.url,
                gender: authData.facebook.cachedUserProfile.gender,
                firstname: authData.facebook.cachedUserProfile.first_name,
                lastname: authData.facebook.cachedUserProfile.last_name
            });
        }
        $state.go('app.home');
    }; //function register(authProvider)


    $ionicModal.fromTemplateUrl('templates/tos.html', {
        scope: $scope
    }).then(function(modalTos) {
        $scope.modalTos = modalTos;
    });

    // Triggered in the login modalTos to close it
    $scope.closeTos = function() {
        $scope.modalTos.hide();
    };

    // Open the login modalTos
    $scope.tos = function() {
        $scope.modalTos.show();
    };

    $ionicModal.fromTemplateUrl('templates/privacy.html', {
        scope: $scope
    }).then(function(modalPriv) {
        $scope.modalPriv = modalPriv;
    });

    // Triggered in the login modalPriv to close it
    $scope.closePriv = function() {
        $scope.modalPriv.hide();
    };

    // Open the login modalPriv
    $scope.privacy = function() {
        $scope.modalPriv.show();
    };

    $scope.goHome = function() {
        $state.go('app.home');
    }
})


.controller('AppCtrl', function($scope, $ionicModal, $timeout) {

})

.controller('ProfileCtrl', function($scope, $firebase, Auth, UserInfo, helper, localstorage, $stateParams) {
    $scope.currentUser = localstorage.getObject('userData');
    var ref = new Firebase("https://huggr.firebaseio.com/users/data/" + $scope.currentUser.profileID);
    var userObject = $firebase(ref).$asObject();
    userObject.$bindTo($scope, "currentUser").then(function() {
        $scope.currentUser.age = helper.calcAge(new Date($scope.currentUser.birthdate));
        localstorage.setObject("userData", $scope.currentUser)
    });

    console.log(UserInfo.getProfile("8822986615"));

})

.controller("SampleCtrl", ["$scope", "$firebase", "Auth", "$stateParams",
    function($scope, Auth, $firebase, $stateParams) {
        //$scope.auth = Auth;
        //$scope.user = $scope.auth.$getAuth();
        console.log($stateParams);
        var ref = new Firebase("https://huggr.firebaseio.com/");

        var sync = $firebase(ref).$asObject();

        $scope.huggRef = $firebase(ref.child("hugg")).$asArray();

        $scope.requestHugg = function requestHugg(huggLocation, huggDate, huggTime, userObj) {

            var huggID = Math.floor(Math.random() * (9999999999 - 1000000000 + 1) + 1000000000);

            while ($scope.huggRef.$getRecord(huggID) != null) {
                huggID = Math.floor(Math.random() * (9999999999 - 1000000000 + 1) + 1000000000);
            }

            var date = new Date();
            var today = date.getTime();

            $firebase(ref.child("hugg").child(huggID)).$set({
                huggID: huggID,
                huggLocation: huggLocation,
                huggDate: huggDate,
                huggTime: huggTime,
                done: "0",
                answered: "0",
                accepted: "0",
                reqProfile: userObj,
                reqProfileID: userObj.profileID,
                requestTime: today,
            });
            $firebase(ref.child("hugg").child(huggID).child("rating")).$set({
                rateReqHugg: ".",
                rateAnswerHugg: ".",
                total: "."
            });
            $firebase(ref.child("hugg").child(huggID).child("blocked")).$set({
                blockedProfileID: "."
            });
        };

    }
])

.controller('SettingsCtrl', function($scope, localstorage, $firebase, $cordovaCamera) {
    //Initial holen wir die Nutzerdaten aus dem Localstorage, damit wir mit der ProfileID arbeiten können.
    $scope.userData = localstorage.getObject('userData');

    var ref = new Firebase("https://huggr.firebaseio.com/users/data/" + $scope.userData.profileID);
    var userObject = $firebase(ref).$asObject();
    //Katsching! Three-Way-Databinding 4tw! <3 AngularFire
    userObject.$bindTo($scope, "userData").then(localstorage.setObject("userData", $scope.userData));
    //Todo: den tatsächlichen Connect zu dem jeweils anderen dienst
    var returnval = 0;
    if ($scope.userData.googleID != null) {
        returnval = returnval + 10;
    }
    if ($scope.userData.facebookID != null) {
        returnval = returnval + 1;
    }
    $scope.gProvider = false;
    $scope.fbProvider = false;
    if (returnval == 0) {
        console.warn("Keine Services");
    }
    if (returnval == 1) {
        $scope.gProvider = true;
    }
    if (returnval == 10) {
        $scope.fbProvider = true;
    }
    if (returnval == 11) {
        $scope.fbProvider = false;
        $scope.gProvider = false;
    }

    var connectRef = new Firebase("https://huggr.firebaseio.com/users/");
    $scope.googleRef = $firebase(connectRef.child("signin").child("google")).$asArray();
    $scope.facebookRef = $firebase(connectRef.child("signin").child("facebook")).$asArray();

    var mainref = new Firebase("https://huggr.firebaseio.com/");

    $scope.connect = function connect(provider) {
        if (provider == "toGoogle") {
            connectRef.authWithOAuthPopup("google", function(err, user) {
                if (err) {
                    console.log(err);
                }
                if (user) {
                    connectRef.onAuth(function(authData) {
                        $firebase(mainref.child("users").child("signin").child("google").child(authData.google.id)).$set({
                            displayName: authData.google.displayName,
                            token: authData.token,
                            expires: authData.expires,
                            uid: authData.uid,
                            ID: authData.google.id,
                            AccessToken: authData.google.accessToken,
                            profileID: $scope.userData.profileID
                        });
                        $firebase(ref).$update({
                            googleID: authData.google.id
                        });
                    });

                }
            });
        }
        if (provider == "toFacebook") {
            connectRef.authWithOAuthPopup("facebook", function(err, user) {
                if (err) {
                    console.log(err);
                }
                if (user) {
                    connectRef.onAuth(function(authData) {
                        $firebase(mainref.child("users").child("signin").child("facebook").child(authData.facebook.id)).$set({
                            displayName: authData.facebook.displayName,
                            token: authData.token,
                            expires: authData.expires,
                            uid: authData.uid,
                            ID: authData.facebook.id,
                            AccessToken: authData.facebook.accessToken,
                            profileID: $scope.userData.profileID
                        });
                        $firebase(ref).$update({
                            facebookID: authData.facebook.id
                        });
                    });
                }
            });
        }
    }

    document.addEventListener("deviceready", function() {

        var options = {
            quality: 50,
            destinationType: Camera.DestinationType.DATA_URL,
            sourceType: Camera.PictureSourceType.CAMERA,
            allowEdit: true,
            encodingType: Camera.EncodingType.JPEG,
            targetWidth: 100,
            targetHeight: 100,
            popoverOptions: CameraPopoverOptions,
            saveToPhotoAlbum: false
        };
        $scope.takeNewPicture = function() {
            $cordovaCamera.getPicture(options).then(function(imageData) {
                $scope.userData.picture = "data:image/jpeg;base64," + imageData;
            }, function(err) {
                // error
            });
        };


    }, false);

})


.controller('PlaylistCtrl', function($scope, $stateParams) {

})

.controller('homeCtrl', function($scope, $ionicLoading, $cordovaGeolocation, $ionicPopover, $state, localstorage) {
    //Setze Koordinaten für Initialisierung von Maps
    $scope.positions = {
        lat: 49.4677562,
        lng: 8.506636
    };

    $scope.$on('mapInitialized', function(event, map) {
        $scope.map = map;
        //hole die GPS/IP-Geolocation
        $cordovaGeolocation
            .getCurrentPosition()
            .then(function(position) {
                //wandle in google Maps format um
                var pos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                $scope.positions.lat = pos.k;
                $scope.positions.lng = pos.D;
            }, function(err) {
                alert("error locating the user");
            });
    });

    $ionicPopover.fromTemplateUrl('templates/popovers/hugSettings.html', {
        scope: $scope,
    }).then(function(popover) {
        $scope.popover = popover;
    });
    $scope.openPopover = function($event) {
        $scope.popover.show($event);
    };
    $scope.closePopover = function() {
        $scope.popover.hide();
    };
    //Cleanup the popover when we're done with it!
    $scope.$on('$destroy', function() {
        $scope.popover.remove();
    });
    // Execute action on hide popover
    $scope.$on('popover.hidden', function() {
        // Execute action
    });
    // Execute action on remove popover
    $scope.$on('popover.removed', function() {
        // Execute action
    });

    //create huggRequest Object to store values from filters popup
    $scope.huggRequest = {
        male: "none",
        female: "none",
        range: "10 km"
    }

    $scope.displayResults = function() {

        var male = $scope.huggRequest.male;
        var female = $scope.huggRequest.female;
        var range = $scope.huggRequest.range;
        //reset huggRequest Object values
        $scope.huggRequest.male = "none";
        $scope.huggRequest.female = "none";
        $scope.huggRequest.range = "none";

        //this opens the results view with the parameters
        $state.go('app.results', {
            male: male,
            female: female,
            range: range
        });
    };
})

.controller('resultCtrl', function($scope, Auth, $firebase, $stateParams, localstorage) {
    $scope.auth = Auth;
    $scope.user = $scope.auth.$getAuth();
    var ref = new Firebase("https://huggr.firebaseio.com/");
    var sync = $firebase(ref).$asObject();
    $scope.huggRef = $firebase(ref.child("hugg")).$asArray();
    $scope.currentUser = localstorage.getObject('userData');
    
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
    
    //chek for range values
    if($stateParams.range == "5 km")
    {
        range = 5;
    }
    if($stateParams.range == "10 km")
    {
        range = 10;
    }
    else
    {
        range = 100;
    }

    //function to request a hugg in case the presented huggs are not suitable
    $scope.requestHugg = function requestHugg(reqLat, reqLong) {

        var huggID = Math.floor(Math.random() * (9999999999 - 1000000000 + 1) + 1000000000);

        $scope.huggRef.$loaded().then(function(data) {
            while (data.$getRecord(huggID) != null) {
                huggID = Math.floor(Math.random() * (9999999999 - 1000000000 + 1) + 1000000000);
            }

            var date = new Date();
            var today = date.getTime();

            $firebase(ref.child("hugg").child(huggID)).$set({
                huggID: huggID,
                reqLat: reqLat,
                reqLong: reqLong,
                FilterGender: gender,
                done: 0,
                answered: 0,
                accepted: 0,
                reqProfileID: $scope.currentUser.profileID,
                reqProfileGender: $scope.currentUser.gender,
                requestTime: today,
                reqFirstName: $scope.currentUser.firstname,
                reqPicture: $scope.currentUser.picture
                
            });
            $firebase(ref.child("hugg").child(huggID).child("rating")).$set({
                rateReqHugg: ".",
                rateAnswerHugg: ".",
                total: "."
            });
            $firebase(ref.child("hugg").child(huggID).child("blocked")).$set({
                blockedProfileID: "."
            });
            console.log("success " + huggID);
        });
    };

    
    //displays all huggs that suit the request
    //if huggs are not answered, they are also not done or accepted
    $scope.orderHuggRef = $firebase(ref.child("hugg").orderByChild('answered').equalTo(0).limitToFirst(100)).$asArray();
    $scope.orderHuggRef.$loaded().then(function(data) {
        var i = 0;
        //parse all elements of returning array
        while(data.$keyAt(i)!=null)
        {
            var record = data.$getRecord(data.$keyAt(i));
            
            if( ((gender == "both") || (gender != "both" && record.reqProfileGender == gender)) && ( (record.FilterGender == "both")||(record.FilterGender != "both" && record.FilterGender == $scope.currentUser.gender)) )
            {
                console.log("Result "+i+" "+record.reqFirstName+" ReqProfileGender "+record.reqProfileGender+ " FilterGender "+ record.FilterGender);
                //calculate range
            }
            
            i++;
        }
        //console.log($scope.orderHuggRef);
    });

    /* function findHuggs() {
        var huggArray = {
            id: []
        };
        var stringProfileID = $scope.currentUser.profileID.toString();

        
        
        
        if (snapshot.val().accepted == "0" && snapshot.val().answered == "0" && snapshot.val().done == "0" && snapshot.val().reqProfile.profileID != $scope.currentUser.profileID && !(snapshot.child("blocked").hasChild(stringProfileID))) {
            huggArray.id.push({
                "huggID": snapshot.val().huggID,
                "reqProfile": snapshot.val().reqProfile,
                "huggLocation": snapshot.val().huggLocation,
                "huggDate": snapshot.val().huggDate,
                "huggTime": snapshot.val().huggTime,
                "requestTime": snapshot.val().requestTime
            });
        }

    };*/


    $scope.results = [];
    for (var i = 0; i < 5; i++) {
        $scope.results[i] = {
            name: i + 1,
            items: []
        };
        for (var j = 0; j < 3; j++) {
            $scope.results[i].items.push(i + '-' + j);
        }
    }

    /*
     * if given group is the selected group, deselect it
     * else, select the given group
     */
    $scope.toggleGroup = function(group) {
        if ($scope.isGroupShown(group)) {
            $scope.shownGroup = null;
        } else {
            $scope.shownGroup = group;
        }
    };
    $scope.isGroupShown = function(group) {
        return $scope.shownGroup === group;
    };
});