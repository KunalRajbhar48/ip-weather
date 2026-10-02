const API_KEY = process.env.OPENWEATHER_API_KEY;;

const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const addBtn = document.getElementById("addBtn");
const message = document.getElementById("message");
const placesList = document.getElementById("placesList");
const noPlaces = document.getElementById("noPlaces");
const weatherCard = document.getElementById("weatherCard");
const forecastSection = document.getElementById("forecastSection");

let currentPlace = null;

let savedPlaces =
  JSON.parse(localStorage.getItem("weatherPlaces")) || [];

function getWeatherIcon(iconCode) {
  const icons = {
    "01d": "☀️",
    "01n": "🌙",
    "02d": "🌤️",
    "02n": "☁️",
    "03d": "☁️",
    "03n": "☁️",
    "04d": "☁️",
    "04n": "☁️",
    "09d": "🌦️",
    "09n": "🌦️",
    "10d": "🌧️",
    "10n": "🌧️",
    "11d": "⛈️",
    "11n": "⛈️",
    "13d": "❄️",
    "13n": "❄️",
    "50d": "🌫️",
    "50n": "🌫️"
  };

  return icons[iconCode] || "🌡️";
}

function showMessage(text, isError = false) {
  message.textContent = text;

  if (isError) {
    message.classList.add("error");
  } else {
    message.classList.remove("error");
  }
}

async function findCity(cityName) {
  const url =
    `https://api.openweathermap.org/geo/1.0/direct` +
    `?q=${encodeURIComponent(cityName)}` +
    `&limit=1` +
    `&appid=${API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Geocoding API request failed");
  }

  const data = await response.json();

  if (!data || data.length === 0) {
    return null;
  }

  const city = data[0];

  return {
    name: city.name,
    country: city.country || "",
    state: city.state || "",
    lat: city.lat,
    lon: city.lon
  };
}

async function getWeather(place) {
  const currentURL =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?lat=${place.lat}` +
    `&lon=${place.lon}` +
    `&units=metric` +
    `&appid=${API_KEY}`;

  const forecastURL =
    `https://api.openweathermap.org/data/2.5/forecast` +
    `?lat=${place.lat}` +
    `&lon=${place.lon}` +
    `&units=metric` +
    `&appid=${API_KEY}`;

  const [currentResponse, forecastResponse] =
    await Promise.all([
      fetch(currentURL),
      fetch(forecastURL)
    ]);

  if (!currentResponse.ok) {
    throw new Error("Current weather request failed");
  }

  if (!forecastResponse.ok) {
    throw new Error("Forecast request failed");
  }

  const currentData = await currentResponse.json();
  const forecastData = await forecastResponse.json();

  return {
    current: currentData,
    forecast: forecastData
  };
}

async function searchWeather() {
  const city = cityInput.value.trim();

  if (city === "") {
    showMessage("Please type a city name first.", true);
    return false;
  }

  showMessage("Loading...");

  try {
    const place = await findCity(city);

    if (place === null) {
      showMessage(
        `"${city}" not found. Check the spelling and try again.`,
        true
      );
      return false;
    }

    await loadWeather(place);
    cityInput.value = "";

    return true;
  } catch (error) {
    console.error(error);

    showMessage(
      "Could not load weather. Check your API key or internet connection.",
      true
    );

    return false;
  }
}

async function loadWeather(place) {
  showMessage("Loading...");

  try {
    const data = await getWeather(place);

    currentPlace = place;

    displayCurrent(place, data.current);
    displayForecast(data.forecast);

    showMessage("");
    renderPlaces();
  } catch (error) {
    console.error(error);

    showMessage(
      "Could not load weather. Check your API key or internet connection.",
      true
    );
  }
}

function displayCurrent(place, current) {
  let fullCityName = place.name;

  if (place.state && place.country === "US") {
    fullCityName += `, ${place.state}`;
  }

  if (place.country) {
    fullCityName += `, ${place.country}`;
  }

  document.getElementById("cityName").textContent = fullCityName;

  const localDate = new Date(
    (current.dt + current.timezone) * 1000
  );

  document.getElementById("dateText").textContent =
    localDate.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC"
    });

  document.getElementById("temperature").textContent =
    Math.round(current.main.temp) + "°C";

  document.getElementById("description").textContent =
    capitalize(current.weather[0].description);

  document.getElementById("weatherIcon").textContent =
    getWeatherIcon(current.weather[0].icon);

  document.getElementById("feelsLike").textContent =
    Math.round(current.main.feels_like) + "°C";

  document.getElementById("humidity").textContent =
    current.main.humidity + "%";

  const windSpeed =
    Math.round(current.wind.speed * 3.6);

  document.getElementById("wind").textContent =
    windSpeed + " km/h";

  weatherCard.style.display = "block";
}

function capitalize(text) {
  if (!text) {
    return "";
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getLocalDateKey(timestamp, timezoneOffset) {
  const localTime = new Date(
    (timestamp + timezoneOffset) * 1000
  );

  return localTime.toISOString().split("T")[0];
}

function displayForecast(forecastData) {
  const forecastList =
    document.getElementById("forecastList");

  forecastList.innerHTML = "";

  const timezoneOffset =
    forecastData.city.timezone;

  const daily = {};

  forecastData.list.forEach(function (item) {
    const dateKey =
      getLocalDateKey(
        item.dt,
        timezoneOffset
      );

    if (!daily[dateKey]) {
      daily[dateKey] = [];
    }

    daily[dateKey].push(item);
  });

  const todayKey =
    getLocalDateKey(
      Math.floor(Date.now() / 1000),
      timezoneOffset
    );

  const dates =
    Object.keys(daily)
      .filter(function (date) {
        return date !== todayKey;
      })
      .sort()
      .slice(0, 5);

  dates.forEach(function (date) {
    const items = daily[date];

    let maxTemp = -Infinity;
    let minTemp = Infinity;

    items.forEach(function (item) {
      if (item.main.temp_max > maxTemp) {
        maxTemp = item.main.temp_max;
      }

      if (item.main.temp_min < minTemp) {
        minTemp = item.main.temp_min;
      }
    });

    let representative =
      items.find(function (item) {
        return item.dt_txt.includes("12:00:00");
      });

    if (!representative) {
      representative =
        items[Math.floor(items.length / 2)];
    }

    const [year, month, day] =
      date.split("-").map(Number);

    const dateObject =
      new Date(
        Date.UTC(year, month - 1, day)
      );

    const dayName =
      dateObject.toLocaleDateString("en-IN", {
        weekday: "short",
        timeZone: "UTC"
      });

    const weather =
      representative.weather[0];

    const dayDiv =
      document.createElement("div");

    dayDiv.className = "day";

    const dayNameElement =
      document.createElement("p");

    dayNameElement.className = "day-name";
    dayNameElement.textContent = dayName;

    const iconElement =
      document.createElement("div");

    iconElement.className = "day-icon";
    iconElement.title =
      capitalize(weather.description);
    iconElement.textContent =
      getWeatherIcon(weather.icon);

    const tempElement =
      document.createElement("p");

    tempElement.className = "day-temp";
    tempElement.textContent =
      Math.round(maxTemp) + "° / ";

    const minElement =
      document.createElement("span");

    minElement.className = "min";
    minElement.textContent =
      Math.round(minTemp) + "°";

    tempElement.appendChild(minElement);

    dayDiv.appendChild(dayNameElement);
    dayDiv.appendChild(iconElement);
    dayDiv.appendChild(tempElement);

    forecastList.appendChild(dayDiv);
  });

  forecastSection.style.display = "block";
}

async function addPlace() {
  if (cityInput.value.trim() !== "") {
    const success = await searchWeather();

    if (!success) {
      return;
    }
  }

  if (currentPlace === null) {
    showMessage(
      "Search a city first, then click Add.",
      true
    );

    return;
  }

  const alreadyAdded =
    savedPlaces.some(function (place) {
      return (
        place.lat === currentPlace.lat &&
        place.lon === currentPlace.lon
      );
    });

  if (alreadyAdded) {
    showMessage(
      `${currentPlace.name} is already in your places.`
    );

    return;
  }

  savedPlaces.push(currentPlace);

  saveToStorage();
  renderPlaces();

  showMessage(
    `${currentPlace.name} added.`
  );
}

function removePlace(index) {
  const removed = savedPlaces[index];

  savedPlaces.splice(index, 1);

  saveToStorage();
  renderPlaces();

  showMessage(
    `${removed.name} removed.`
  );
}

function saveToStorage() {
  localStorage.setItem(
    "weatherPlaces",
    JSON.stringify(savedPlaces)
  );
}

function renderPlaces() {
  placesList.innerHTML = "";

  if (savedPlaces.length === 0) {
    noPlaces.style.display = "block";
    return;
  }

  noPlaces.style.display = "none";

  savedPlaces.forEach(function (place, index) {
    const li =
      document.createElement("li");

    li.textContent = place.name;

    if (
      currentPlace &&
      currentPlace.lat === place.lat &&
      currentPlace.lon === place.lon
    ) {
      li.classList.add("active");
    }

    li.addEventListener(
      "click",
      function () {
        loadWeather(place);
      }
    );

    const removeBtn =
      document.createElement("button");

    removeBtn.className = "remove-btn";
    removeBtn.textContent = "×";
    removeBtn.title =
      "Remove " + place.name;

    removeBtn.addEventListener(
      "click",
      function (event) {
        event.stopPropagation();
        removePlace(index);
      }
    );

    li.appendChild(removeBtn);
    placesList.appendChild(li);
  });
}

searchBtn.addEventListener(
  "click",
  searchWeather
);

addBtn.addEventListener(
  "click",
  addPlace
);

cityInput.addEventListener(
  "keydown",
  function (event) {
    if (event.key === "Enter") {
      searchWeather();
    }
  }
);

renderPlaces();

if (savedPlaces.length > 0) {
  loadWeather(savedPlaces[0]);
}