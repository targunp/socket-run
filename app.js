import { MDCRipple } from "@material/ripple";
const ripple = new MDCRipple(document.querySelector(".mdc-button"));

import firebase from "@firebase/app";
import "@firebase/firestore";
firebase.initializeApp({
  apiKey: "AIzaSyB1jmbG8vz0_a-dvj40GDyXjz-l-bGLn70",
  authDomain: "socket-run.firebaseapp.com",
  databaseURL: "https://socket-run.firebaseio.com",
  projectId: "socket-run",
  storageBucket: "socket-run.appspot.com",
  messagingSenderId: "578325125820"
});
const db = firebase.firestore();
let runnerId = null;
let raceId = null;
let endTime = null;
let startTime = null;
let currentLat = null;
let currentLon = null;
let startLat = null;
let startLon = null;
let currentDistance = null;
let racing = false;
let loadRunner = true;

document.querySelector(".human-button").addEventListener("click", readyHuman);
function readyHuman() {
  document.querySelector(".controls").classList.add("hide");
  document.querySelector(".progress").classList.remove("hide");
  document.querySelector(".status").textContent = "Searching GPS";

  navigator.geolocation.watchPosition(
    position => {
      currentLat = position.coords.latitude;
      currentLon = position.coords.longitude;
      document.querySelector(".location").textContent =
        "GPS: " + (position.coords.latitude + ", " + position.coords.longitude);
      console.log(racing);
      if (racing) {
        updateProgress();
      }
      if (loadRunner) {
        loadRunner = false;
        document.querySelector(".status").textContent = "Loading runner";

        db.collection("runners")
          .add({
            created: new Date(),
            racing: false
          })
          .then(function(doc) {
            runnerId = doc.id;
            document.querySelector(".runner").textContent =
              "Runner: " + runnerId;
            document.querySelector(".status").textContent = "Search for race";
            doc.onSnapshot(function(next) {
              const runner = next.data();
              if (runner && runner.racing) {
                db.collection("races")
                  .doc(runner.currentRace)
                  .onSnapshot(function(snap) {
                    raceId = snap.ref.id;
                    const race = snap.data();
                    document.querySelector(".race").textContent =
                      "Race: " + snap.ref.id;
                    document.querySelector(".status").textContent =
                      "Found race";
                    if (race && !race.open) {
                      startTime = race.start;
                      document.querySelector(".start").textContent =
                        "Start: " + race.start.toLocaleString();
                      startCountDown(race.start);
                    }
                  });
              }
            });
          });
      }
    },
    error => {
      alert("Geo Error");
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 30000
    }
  );
}

function readyRobot() {
  db.collection("runners")
    .add({
      created: new Date(),
      racing: false
    })
    .then(function(docRef) {
      console.log("Document written with ID: ", docRef.id);
    })
    .catch(function(error) {
      console.error("Error adding document: ", error);
    });
}
function startCountDown(start) {
  var countDownDate = start.getTime();

  var x = setInterval(function() {
    var now = new Date().getTime();
    var distance = countDownDate - now;
    var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((distance % (1000 * 60)) / 1000);

    seconds = seconds + minutes * 60;
    document.querySelector(".status").textContent =
      "Race starts in: " + seconds + "s ";
    if (distance < 0) {
      racing = true;
      console.log(racing);
      startLat = currentLat;
      startLon = currentLon;
      document.querySelector(".status").textContent = "GO";
      clearInterval(x);
      updateOponent();
    }
  }, 1000);
}

function updateProgress() {
  currentDistance = getDistance(startLat, startLon, currentLat, currentLon);
  document.querySelector(".distance").textContent = currentDistance;

  if (currentDistance > 100) {
    endTime = new Date();
    racing = false;
    document.querySelector(".status").textContent = "Done";
    document.querySelector(".human-progress").textContent = 100 + "%";
    //find winner
    db.collection("races")
      .doc(raceId)
      .collection("runners")
      .doc(runnerId)
      .update({ distance: 100, end: endTime, finished: true });
  } else {
    document.querySelector(".human-progress").textContent =
      Math.floor((currentDistance / 100) * 100) + "%";
    db.collection("races")
      .doc(raceId)
      .collection("runners")
      .doc(runnerId)
      .update({ distance: currentDistance });
  }
}

function updateOponent() {
  db.collection("races")
    .doc(raceId)
    .collection("runners")
    .onSnapshot(function(next) {
      next.forEach(function(result) {
        if (result.id !== runnerId) {
          const data = result.data();
          if (data.finished) {
            if (!racing && data.end > endTime)
              document.querySelector(".status").textContent = "YOU WIN!";
            else {
              racing = false;
              endTime = new Date();
              db.collection("races")
                .doc(raceId)
                .collection("runners")
                .doc(runnerId)
                .update({
                  distance: currentDistance,
                  end: endTime,
                  finished: true
                });

              document.querySelector(".status").textContent = "YOU LOSE!";
            }
          } else if (!racing) {
            document.querySelector(".status").textContent = "YOU WIN!";
          } else {
            document.querySelector(".robot-progress").textContent =
              Math.floor((data.distance / 100) * 100) + "%";
          }
        }
      });
    });
}

function getDistance(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1); // deg2rad below
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c * 1000; // Distance in km
  return Math.abs(d);
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
