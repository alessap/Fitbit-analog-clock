import clock from "clock";
import document from "document";
import * as messaging from "messaging";
import { HeartRateSensor } from "heart-rate";
import { BodyPresenceSensor } from "body-presence";
import { display } from "display";
import { today } from 'user-activity';
import { preferences } from "user-settings";
import { me as device } from "device";
import { commands, statsIds, tempIds } from "../globals";

// global variables
const IONIC_MODEL_NUMBER = "27";
const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const daysNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dateText = document.getElementById("dateText");
const weatherIcon = document.getElementById("weatherIcon");
const cityname = document.getElementById("cityname");
const degrees = document.getElementById("degrees");
const weatherSection = document.getElementById("weather");
const reloadWeatherButton = document.getElementById("weatherRefreshButton");
const weatherButton = document.getElementById("weatherButton");
const statsButton = document.getElementById("showStatsButton");
const weatherButtonIcon = document.getElementById("weatherButtonIcon");
const ltStatText = document.getElementById("ltStatText");
const rtStatText = document.getElementById("rtStatText");
const lbStatText = document.getElementById("lbStatText");
const rbStatText = document.getElementById("rbStatText");
const toastElement = document.getElementById("toastUse");
const statsDetailsElement = document.getElementById("statsDetailsUse");
const toastText =   document.getElementById("toastText");
const goToClockButton = document.getElementById("goToClockButton");
const weatherView = document.getElementById("weatherView");
const hourHand = document.getElementById("hours");
const minHand = document.getElementById("mins");
const secHand = document.getElementById("secs");
const detailsCityName = document.getElementById("detailsCityName");
const hoursLayer = document.getElementById("hoursLayer");
const minutesLayer = document.getElementById("minutesLayer");
const ltStat = document.getElementById("ltStat");
const lbStat = document.getElementById("lbStat");
const rbStat = document.getElementById("rbStat");
const heartRateSection = document.getElementById("heartRate");

let hrm = null; //heart rate sensor data
let bodyPresence = null; //body presence sensor data
let statsArr = [];
let hrIconEnabled = true;

let toastTimeout = null;
let statsDetailsTimeout = null;
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
  if (display.aodAvailable && display.aodActive) {
    display.aodAllowed = true;

    const rtStatSection = document.getElementById("rtStat");
    const minutesLayer = document.getElementById("minutesLayer");

    display.addEventListener("change", () => {
      if (!display.aodActive && display.on) {
        container.value = 0;
        clock.granularity = "seconds";
        secHand.style.display = "inline";
        weatherSection.style.display = "inline";
        heartRateSection.style.display = "inline";
        rtStatSection.style.display = "inline";
        minutesLayer.style.display = "inline";
        hrm.start();
        bodyPresence.start();
      } else {
        clock.granularity = "minutes";
        secHand.style.display = "none";
        weatherSection.style.display = "none";
        heartRateSection.style.display = "none";
        rtStatSection.style.display = "none";
        minutesLayer.style.display = "none";
        hrm.stop();
        bodyPresence.stop();
      }
    });
  }
};

const handleClockTick = () => {
  let todayDate = new Date();
  let hours = todayDate.getHours() % 12;
  let mins = todayDate.getMinutes();
  let secs = todayDate.getSeconds();

  hourHand.groupTransform.rotate.angle = hoursToAngle(hours, mins);
  minHand.groupTransform.rotate.angle = minutesToAngle(mins);
  secHand.groupTransform.rotate.angle = secondsToAngle(secs);

  updateCornerStats();

  dateText.text = todayDate.getDate() + " " + monthNames[todayDate.getMonth()].substring(0, 3);
}

const updateCornerStats = () => {
  statsArr.forEach((stat) => {
    switch (stat.key) {
      case 'rtStat':
        rtStatText.text = stat.value() || today.adjusted.steps;
        break;
      case 'ltStat':
        ltStatText.text = stat.value();
        break;
      case 'lbStat':
        lbStatText.text = stat.value();
        break;
      case 'rbStat':
        rbStatText.text = stat.value();
        break;
      default:
        break;
    }
  });
}

const fetchTodayWeather = () => {
  weatherButtonIcon.style.display = "inline";
  weatherButtonIcon.animate('enable');
  cityname.text = '';
  weatherIcon.href = '';
  degrees.text = '';
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send({
      command: commands.todayWeather
    });
  } else {
    displayToast("Failed loading weather. Open Fitbit app on your phone.");
  }
}

const fetchStatsSettings = () => {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send({
      command: commands.getStatsSettings
    });
  } else {
    displayToast("Failed loading settings. Open Fitbit app on your phone.");
  }
}

const fetchHRToggleSetting = () => {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send({
      command: commands.disableHRSetting
    });
  } else {
    displayToast("Failed loading settings. Open Fitbit app on your phone.");
  }
}

const fetch5daysWeather = () => {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send({
      command: commands.forecastWeather
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

const displayStatsDetails = () => {
  const statSteps = document.getElementById("statsSteps");
  const statCals = document.getElementById("statsCals");
  const statDist = document.getElementById("statsDist");
  const statHr = document.getElementById("statsHr");
  const statAzm = document.getElementById("statsAzm");
  const statFloors = document.getElementById("statsFloors");

  statSteps.text = today.adjusted.steps || 0;
  statCals.text = today.adjusted.calories || 0;
  statDist.text = today.adjusted.distance || 0;
  statHr.text = (hrm && bodyPresence.present) ? hrm.heartRate : '--';
  statAzm.text = (today.adjusted.activeZoneMinutes && today.adjusted.activeZoneMinutes.total) || 0;
  statFloors.text = today.adjusted.elevationGain || 0;

  statsDetailsElement.style.display = "inline";
  statsDetailsElement.animate("enable"); //show
  if(statsDetailsTimeout !== null) {
    clearTimeout(statsDetailsTimeout);
  }
  statsDetailsTimeout = setTimeout(() => { //wait
    statsDetailsElement.animate("disable"); //hide
    setTimeout(() => {
      statsDetailsElement.style.display = "none";
    }, 1000);
  }, 3000);
}

const setSettingsListener = () => {
  messaging.peerSocket.onopen = () => {
    fetchStatsSettings();
    fetchHRToggleSetting();
    fetchTodayWeather();
  }

  messaging.peerSocket.onerror = () => {
    displayToast("Connection error: waiting for socket to open");
  }

  const weatherInterval = null;
  messaging.peerSocket.onmessage = (evt) => {
    const data = evt.data;
  
    if (data.error) {
      return displayToast(data.error);
    }

    switch (data.command) {
      case commands.todayWeather:
        if (data.enabled === 'true' && data.hasApi)  {
          weatherSection.style.display = "inline";
          weatherView.style.display = "inline";
          reloadWeatherButton.style.display = "inline";
          weatherButton.style.display = "inline";
          weatherButtonIcon.style.display = "inline";
          const updateMinutes = data.updateEveryMinutes ? data.updateEveryMinutes : 30;  
          if (data.temperature) {
            const el = data.weatherElement;
            cityname.text = data.cityName;
            document.getElementById('customTextarea');
            weatherIcon.href = "weatherimages/"+el.icon+".png";
            degrees.text = Math.round(data.temperature) + "°";
            weatherButtonIcon.style.display = "none";
            if(weatherInterval !== null) {
              clearInterval(weatherInterval);
            }
            weatherInterval = setInterval(fetchTodayWeather, Number(updateMinutes) * 1000 * 60);
          }
        } else {
          weatherSection.style.display = "none";
          weatherView.style.display = "none";
          reloadWeatherButton.style.display = "none";
          weatherButton.style.display = "none";
          weatherButtonIcon.style.display = "none";
          cityname.text = '';
          degrees.text = '';
        }
        break;
      case commands.forecastWeather:
        if (data.enabled === 'true')  {
          detailsCityName.text = data.cityName;
        }
        if (data.svgElement) {
          const messages = data.weatherDayMessage;
          
          const svgElement = document.getElementById("day"+data.svgElement);
          svgElement.getElementById("dayName").text = daysNames[messages[0].day];
          messages.slice().reverse().forEach((hourWeather, i) => {
            const hourElement = svgElement.getElementById("hour"+i);
            const temperatureElement = hourElement.getElementById("rowWeatherDegrees");            
            const unit = data.temperatureUnit;
            
            switch (unit) {
              case tempIds.f:
                temperatureElement.style.fontSize = 16;
                break;
              case tempIds.k:
                temperatureElement.style.fontSize = 16;
                break;
              case tempIds.c:
                temperatureElement.style.fontSize = 20;
                break;
              default:
                break;
            }

            temperatureElement.text = Math.round(hourWeather.temperature) + "°";

            if(preferences.clockDisplay === '24h'){
              hourElement.getElementById("rowWeatherTime").text = hourWeather.hour + ":00";
            } else {
              const addString = ([0,1,2,3].includes(i)) ? ' PM' : ' AM';
              hourElement.getElementById("rowWeatherTime").text = hourWeather.hour%12 + addString;
            }
            hourElement.getElementById("rowWeatherIcon").href = `weatherimages/${hourWeather.icon}.png`;
          });
        }
        break;
      case commands.getStatsSettings:
        ltStat.style.display = "none";
        lbStat.style.display = "none";
        rbStat.style.display = "none";

        const { payload } = data;

        statsArr = [...Object.keys(payload).reduce((acc, key) => {
          if (payload[key]) {
            acc.push({
              key,
              stat: payload[key],
              value: getStatFunction(payload[key])
            });
          }

          return acc;
        }, [])];

        statsArr.forEach((stat) => {
            switch (stat.key) {
              case 'ltStat':
                ltStat.style.display = "inline";
                break;
              case 'lbStat':
                lbStat.style.display = "inline";
                break;
              case 'rbStat':
                rbStat.style.display = "inline";
                break;
              default:
                break;
            }

            const statImage = document.getElementById(`${stat.key}Image`);
            statImage.href = `statsimages/${stat.stat}.png`;
            updateCornerStats();
        });
        break;
      case commands.settingsChanged:
        fetchStatsSettings();
        fetchHRToggleSetting();
        break;
      case commands.disableHRSetting:
        hrIconEnabled = !data.disabled;
        if (hrIconEnabled) {
          heartRateSection.style.display = "inline";
        } else {
          heartRateSection.style.display = "none";
        }
      default:
        break;
    }
  }
}

const getStatFunction = (stat) => {
  switch (stat) {
    case statsIds.steps:
      return () => today.adjusted.steps || 0;
    case statsIds.cals:
      return () => today.adjusted.calories || 0;
    case statsIds.dist:
      return () => today.adjusted.distance || 0;
    case statsIds.hr:
      return () => (hrm && bodyPresence.present) ? hrm.heartRate : '--';
    case statsIds.azm:
      return () => (today.adjusted.activeZoneMinutes && today.adjusted.activeZoneMinutes.total) || 0;
    case statsIds.floors:
      return () => today.adjusted.elevationGain || 0;
    default:
      return;
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
    } else if (weatherIcon.href.length){
      fetch5daysWeather();
      container.value = 1;
    }
  }

  statsButton.onclick = () => {
    displayStatsDetails();
  }
  
  goToClockButton.onclick = () => {
    container.value = 0;
  }
}

const setAllListeners = () => {
  ltStat.style.display = "none";
  lbStat.style.display = "none";
  rbStat.style.display = "none";

  clock.granularity = "seconds"; // Update the clock every second

  if (device.modelId === IONIC_MODEL_NUMBER) {
    minutesLayer.href = "background/minutesIonic.png";
    hoursLayer.href = "background/hoursIonic.png";
  }

  setSettingsListener();
  setHeartListener();
  setAodListener();
  setButtonsListeners();

  clock.ontick = () => handleClockTick();
}

setAllListeners();
