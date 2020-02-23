import clock from "clock";
import document from "document";
import * as messaging from "messaging";
import { HeartRateSensor } from "heart-rate";
import { BodyPresenceSensor } from "body-presence";
import { display } from "display";
import { today } from 'user-activity';
import { preferences } from "user-settings";

// global variables
const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const daysNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dateText = document.getElementById("dateText");
const img = document.getElementById("weatherIcon");
const cityname = document.getElementById("cityname").getElementById('text');
const degrees = document.getElementById("degrees");
const reloadWeatherButton = document.getElementById("weatherRefreshButton");
const weatherButton = document.getElementById("weatherButton");
const weatherButtonIcon = document.getElementById("weatherButtonIcon");
const stepsText = document.getElementById("stepstext");
const toastElement = document.getElementById("toastUse");
const toastText =   document.getElementById("toastText");
const goToClockButton = document.getElementById("goToClockButton");
const weatherView = document.getElementById("weatherView");
const hourHand = document.getElementById("hours");
const minHand = document.getElementById("mins");
const secHand = document.getElementById("secs");
const detailsCityName = document.getElementById("detailsCityName");

let hrm = null; //heart rate sensor data
let bodyPresence = null; //body presence sensor data

let toastTimeout = null;
let container = document.getElementById("container");

const hoursToAngle = (hours, minutes) => {
  let hourAngle = (360 / 12) * hours;
  let minAngle = (360 / 12 / 60) * minutes;
  return hourAngle + minAngle;
}

const minutesToAngle = (minutes) => {
  return (360 / 60) * minutes;
}

const secondsToAngle = (seconds) => {
  return (360 / 60) * seconds;
}

const setAodListener = () => {
  if (display.aodAvailable) {
    display.aodAllowed = true;

    const weatherSection = document.getElementById("weather");
    const heartRateSection = document.getElementById("heartRate");
    const stepsSection = document.getElementById("steps");
    const minutesLayer = document.getElementById("minutesLayer");

    display.addEventListener("change", () => {
      if (!display.aodActive && display.on) {
        container.value = 0;
        clock.granularity = "seconds";
        secHand.style.display = "inline";
        weatherSection.style.display = "inline";
        heartRateSection.style.display = "inline";
        stepsSection.style.display = "inline";
        minutesLayer.style.display = "inline";
        hrm.start();
        bodyPresence.start();
      } else {
        clock.granularity = "minutes";
        secHand.style.display = "none";
        weatherSection.style.display = "none";
        heartRateSection.style.display = "none";
        stepsSection.style.display = "none";
        minutesLayer.style.display = "none";
        hrm.stop();
        bodyPresence.stop();
      }
    });
  }
};

const hanldeClockTick = () => {
  let todayDate = new Date();
  let hours = todayDate.getHours() % 12;
  let mins = todayDate.getMinutes();
  let secs = todayDate.getSeconds();

  hourHand.groupTransform.rotate.angle = hoursToAngle(hours, mins);
  minHand.groupTransform.rotate.angle = minutesToAngle(mins);
  secHand.groupTransform.rotate.angle = secondsToAngle(secs);

  stepsText.text = today.adjusted.steps;
  dateText.text = todayDate.getDate() + " " + monthNames[todayDate.getMonth()].substring(0, 3);
}

const fetchTodayWeather = () => {
  weatherButtonIcon.style.display = "inline";
  weatherButtonIcon.animate('enable');
  cityname.text = '';
  img.href = '';
  degrees.text = '';
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send({
      command: 'todayWeather'
    });
  } else {
    displayToast("Failed loading weather. Open Fitbit app on your phone.");
  }
}

const fetch5daysWeather = () => {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send({
      command: 'forecastWeather'
    });
  } else {
    displayToast("Failed loading weather. Open Fitbit app on your phone.");
  }
}

const displayToast = (message) => {
  toastText.text = message;
  toastElement.animate("enable"); //show toast
  if(toastTimeout !== null) {
    clearTimeout(toastTimeout);
  }
  toastTimeout = setTimeout(() => { //wait a second showing message
    toastElement.animate("disable"); //hide toast
  }, 3000);
}  

const setWeatherListener = () => {
  messaging.peerSocket.onopen = () => {
    fetchTodayWeather();
  }

  messaging.peerSocket.onerror = () => {
    displayToast("Connection error: waiting for socket to open");
  }

  const weatherInterval = null;
  messaging.peerSocket.onmessage = (evt) => {
    const data = evt.data;
    switch (data.command) {
      case 'todayWeather':
        if (data.enabled === 'true')  {
          weatherView.style.display = "inline";
          reloadWeatherButton.style.display = "inline";
          weatherButton.style.display = "inline";
          weatherButtonIcon.style.display = "inline";
          const updateMinutes = data.updateEveryMinutes ? data.updateEveryMinutes : 30;  
          if (data.temperature) {
            const el = data.weatherElement;
            cityname.text = data.cityName;
            document.getElementById('customTextarea');
            img.href = "weatherimages/"+el.icon+".png";
            degrees.text = Math.round(data.temperature) + "°";
            weatherButtonIcon.style.display = "none";
            if(weatherInterval !== null) {
              clearInterval(weatherInterval);
            }
            weatherInterval = setInterval(fetchTodayWeather, Number(updateMinutes) * 1000 * 60);
          }
          if (data.error !== null) {
            displayToast(data.error);
          }
        } else {
          weatherView.style.display = "none";
          reloadWeatherButton.style.display = "none";
          weatherButton.style.display = "none";
          weatherButtonIcon.style.display = "none";
          cityname.text = '';
          img.href = '';
          degrees.text = '';
        }
        break;
      case 'forecastWeather':
        if (data.enabled === 'true')  {
          detailsCityName.text = data.cityName;
        }
        if (data.svgElement) {
          const messages = data.weatherDayMessage;
          
          const svgElement = document.getElementById("day"+data.svgElement);
          svgElement.getElementById("dayName").text = daysNames[messages[0].day];
          messages.slice().reverse().forEach((hourWeather, i) => {
            const hourElement = svgElement.getElementById("hour"+i);
            hourElement.getElementById("rowWeatherDegrees").text = Math.round(hourWeather.temperature) + "°";
            if(preferences.clockDisplay === '24h'){
              hourElement.getElementById("rowWeatherTime").text = hourWeather.hour + ":00";
            } else {
              const addString = ([0,1,2,3].includes(i)) ? ' PM' : ' AM';
              hourElement.getElementById("rowWeatherTime").text = hourWeather.hour%12 + addString;
            }
            hourElement.getElementById("rowWeatherIcon").href = "weatherimages/"+hourWeather.icon+".png";
          });
        }
        break;
      default:
        break;
    }
    
  }
}

const setHeartListener = () => {
  const heartRateText = document.getElementById("heartratetext");
  if (HeartRateSensor) {
    hrm = new HeartRateSensor();
    hrm.addEventListener("reading", () => {
      heartRateText.text = hrm.heartRate;
    });
    hrm.start();
  }

  if (BodyPresenceSensor) {
    bodyPresence = new BodyPresenceSensor();
    bodyPresence.addEventListener("reading", () => {
      if (!bodyPresence.present) {
        heartRateText.text = "--";
        hrm.stop();
      } else {
        hrm.start();
      }
    });
    bodyPresence.start();
  }
}

const setButtonsListeners = () => {
  reloadWeatherButton.onclick = () => {
    fetchTodayWeather();
  }
  
  weatherButton.onclick = () => {
    if (weatherButtonIcon.style.display === "inline"){
      fetchTodayWeather();
    } else {
      fetch5daysWeather();
      container.value = 1;
    }
  }
  
  goToClockButton.onclick = () => {
    container.value = 0;
  }
}

const setAllListeners = () => {
  clock.granularity = "seconds"; // Update the clock every second

  setWeatherListener();
  setHeartListener();
  setAodListener();
  setButtonsListeners();

  clock.ontick = () => hanldeClockTick();
}

setAllListeners();
