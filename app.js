// Base URL for OpenWeatherMap (we use config.js for API_KEY)
const BASE_URL = "https://api.openweathermap.org/data/2.5";

// Cache all important elements once
const els = {
  // Current weather card
  tempValue: document.getElementById("temp-value"),
  weatherDesc: document.getElementById("weather-desc"),
  weatherLocation: document.getElementById("weather-location"),
  pressure: document.getElementById("pressure"),
  visibility: document.getElementById("visibility"),
  humidity: document.getElementById("humidity"),

  // Air quality
  aqiNumber: document.getElementById("aqi-number"),
  aqiStatus: document.getElementById("aqi-status"),
  aqiIndicator: document.getElementById("aqi-indicator"),

  // Timeline + forecast
  tempTimeline: document.getElementById("temp-timeline"),
  forecastList: document.getElementById("forecast-list"),

  // Tomorrow card
  tomorrowCity: document.getElementById("tomorrow-city"),
  tomorrowTemp: document.getElementById("tomorrow-temp"),
  tomorrowDesc: document.getElementById("tomorrow-desc"),

  // Sun + UV
  sunLocation: document.getElementById("sun-location"),
  sunCurrentTemp: document.getElementById("sun-current-temp"),
  sunriseTime: document.getElementById("sunrise-time"),
  sunsetTime: document.getElementById("sunset-time"),
  uvValue: document.getElementById("uv-value"),
  uvLevel: document.getElementById("uv-level"),
  uvBadge: document.getElementById("uv-badge"),

  // Search
  searchForm: document.getElementById("search-form"),
  searchInput: document.getElementById("search-input"),
};


async function fetchWeatherByCity(city) {
  const res = await fetch(
    `${BASE_URL}/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`
  );
  if (!res.ok) throw new Error("City not found");
  return res.json();
}

async function fetchForecastByCoords(lat, lon) {
  const res = await fetch(
    `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
  );
  if (!res.ok) throw new Error("Failed to fetch forecast");
  return res.json();
}

async function fetchAirQuality(lat, lon) {
  const res = await fetch(
    `${BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
  );
  if (!res.ok) throw new Error("Failed to fetch air quality");
  return res.json();
}

function formatTime(unixSeconds, timezoneOffset) {
  // both in seconds
  const local = new Date((unixSeconds + timezoneOffset) * 1000);
  let hours = local.getUTCHours();
  const minutes = local.getUTCMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}


function renderCurrentWeather(data) {
  els.tempValue.textContent = Math.round(data.main.temp);
  els.weatherDesc.textContent = data.weather[0].description;
  els.weatherLocation.textContent = `${data.name}, ${data.sys.country}`;
  els.pressure.textContent = data.main.pressure;
  els.visibility.textContent = (data.visibility / 1000).toFixed(1);
  els.humidity.textContent = data.main.humidity;

  // Sun card top info
  els.sunLocation.textContent = `${data.name}, ${data.sys.country}`;
  els.sunCurrentTemp.textContent = `${Math.round(data.main.temp)}°C`;

  const timezoneOffset = data.timezone; // seconds
  els.sunriseTime.textContent = formatTime(data.sys.sunrise, timezoneOffset);
  els.sunsetTime.textContent = formatTime(data.sys.sunset, timezoneOffset);
}

function renderAirQuality(aqiData) {
  const record = aqiData.list[0];
  const aqi = record.main.aqi;

  const labels = {
    1: "Good",
    2: "Fair",
    3: "Moderate",
    4: "Poor",
    5: "Very Poor",
  };

  els.aqiNumber.textContent = aqi;
  els.aqiStatus.textContent = labels[aqi] || "Unknown";

  // Position indicator on bar: 0% = Good, 100% = Very Poor
  const percentage = ((aqi - 1) / 4) * 100;
  els.aqiIndicator.style.left = `${percentage}%`;
}

function buildDailyForecastMap(forecast) {
  const map = {};

  forecast.list.forEach((item) => {
    const [dateStr] = item.dt_txt.split(" "); // "YYYY-MM-DD HH:mm:ss" → "YYYY-MM-DD"
    if (!map[dateStr]) map[dateStr] = [];
    map[dateStr].push(item);
  });

  return map;
}

function renderForecast(forecast) {
  const dailyMap = buildDailyForecastMap(forecast);
  const dates = Object.keys(dailyMap);

  const todayStr = new Date().toISOString().slice(0, 10);
  const nextDays = dates.filter((d) => d !== todayStr).slice(0, 5);

  els.forecastList.innerHTML = "";

  nextDays.forEach((dateStr, index) => {
    const entries = dailyMap[dateStr];

    const temps = entries.map((e) => e.main.temp);
    const min = Math.round(Math.min(...temps));
    const max = Math.round(Math.max(...temps));

    const midday =
      entries.find((e) => e.dt_txt.includes("12:00:00")) || entries[0];

    const iconCode = midday.weather[0].icon;
    const description = midday.weather[0].main;

    const li = document.createElement("li");
    li.className = "forecast-item";

    const dateObj = new Date(dateStr);
    const weekday = dateObj.toLocaleDateString(undefined, {
      weekday: "short",
    });

    li.innerHTML = `
      <span class="forecast-day">${weekday}</span>
      <img src="https://openweathermap.org/img/wn/${iconCode}.png" alt="${description}" class="forecast-icon" />
      <span class="forecast-desc">${description}</span>
      <span class="forecast-temp">${min}° / ${max}°</span>
    `;

    els.forecastList.appendChild(li);

    // First next day = Tomorrow card
    if (index === 0) {
      els.tomorrowCity.textContent = forecast.city.name;
      els.tomorrowTemp.textContent = max;
      els.tomorrowDesc.textContent = description;
    }
  });
}

function renderTempTimeline(forecast) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayData = forecast.list.filter((item) =>
    item.dt_txt.startsWith(todayStr)
  );

  if (!todayData.length) {
    els.tempTimeline.innerHTML = "<p>No data for today</p>";
    return;
  }

  const slots = [
    { label: "Morning", time: "09:00:00" },
    { label: "Afternoon", time: "15:00:00" },
    { label: "Evening", time: "18:00:00" },
    { label: "Night", time: "21:00:00" },
  ];

  const nodes = slots
    .map((slot) => {
      const entry =
        todayData.find((item) => item.dt_txt.includes(slot.time)) ||
        todayData[todayData.length - 1];

      if (!entry) return "";

      const temp = Math.round(entry.main.temp);
      const icon = entry.weather[0].icon;
      const desc = entry.weather[0].main;

      return `
        <div class="timeline-item">
          <span class="timeline-label">${slot.label}</span>
          <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${desc}" class="timeline-icon" />
          <span class="timeline-temp">${temp}°C</span>
        </div>
      `;
    })
    .join("");

  els.tempTimeline.innerHTML = nodes;
}

function renderUVFromWeather(currentWeather) {
  const main = currentWeather.weather[0].main.toLowerCase();
  let uv = 3;

  if (main.includes("clear")) uv = 8;
  else if (main.includes("cloud")) uv = 4;
  else if (main.includes("rain")) uv = 2;

  els.uvValue.textContent = uv;

  let level = "Low";
  let message = "Low risk of UV rays";

  if (uv >= 3 && uv <= 5) {
    level = "Moderate";
    message = "Moderate risk of UV rays";
  } else if (uv >= 6 && uv <= 7) {
    level = "High";
    message = "High risk of UV rays";
  } else if (uv >= 8) {
    level = "Very High";
    message = "Very high risk of UV rays";
  }

  els.uvBadge.textContent = level;
  els.uvLevel.textContent = message;
}


async function loadCity(city) {
  try {
    const weather = await fetchWeatherByCity(city);
    const { lat, lon } = weather.coord;

    const [forecast, airQuality] = await Promise.all([
      fetchForecastByCoords(lat, lon),
      fetchAirQuality(lat, lon),
    ]);

    renderCurrentWeather(weather);
    renderForecast(forecast);
    renderTempTimeline(forecast);
    renderAirQuality(airQuality);
    renderUVFromWeather(weather);

    localStorage.setItem("lastCity", city);
  } catch (err) {
    console.error(err);
    alert(err.message || "Something went wrong");
  }
}

// Search handler
els.searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = els.searchInput.value.trim();
  if (!city) return;
  loadCity(city);
});

// Initial load
const lastCity = localStorage.getItem("lastCity") || "Delhi";
loadCity(lastCity);

