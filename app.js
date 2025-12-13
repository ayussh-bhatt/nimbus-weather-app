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
  currentTime: document.getElementById("current-time"),
  uvValue: document.getElementById("uv-value"),
  uvLevel: document.getElementById("uv-level"),
  uvBadge: document.getElementById("uv-badge"),

  // Search
  searchForm: document.getElementById("search-form"),
  searchInput: document.getElementById("search-input"),
};

// Map OpenWeather "main" values to Lucide icon names
const conditionIconMap = {
  Clear: "sun",
  Clouds: "cloud",
  Rain: "cloud-rain",
  Drizzle: "cloud-drizzle",
  Thunderstorm: "cloud-lightning",
  Snow: "cloud-snow",
  Mist: "cloud-fog",
  Smoke: "cloud-fog",
  Haze: "cloud-fog",
  Dust: "cloud-fog",
  Fog: "cloud-fog",
  Sand: "cloud-fog",
  Ash: "cloud-fog",
  Squall: "wind",
  Tornado: "wind",
};

// Helper: returns Lucide icon name for a weather "main" string
function getLucideIconName(main) {
  return conditionIconMap[main] || "cloud";
}

// Map OpenWeather "main" → Lucide icon name (for timeline)
const weatherLucideIconMap = {
  Clear: "sun",
  Clouds: "cloud",
  Rain: "cloud-rain",
  Drizzle: "cloud-drizzle",
  Thunderstorm: "cloud-lightning",
  Snow: "snowflake",
  Mist: "cloud-fog",
  Smoke: "cloud-fog",
  Haze: "cloud-fog",
  Dust: "cloud-fog",
  Fog: "cloud-fog",
  Sand: "cloud-fog",
  Ash: "cloud-fog",
  Squall: "wind",
  Tornado: "wind",
};

function getLucideWeatherIcon(main) {
  return weatherLucideIconMap[main] || "cloud";
}


// Flag to toggle 3-day / 5-day forecast view
let showFullForecast = false;

async function fetchWeatherByCity(city) {
  const res = await fetch(
    `${BASE_URL}/weather?q=${encodeURIComponent(
      city
    )}&units=metric&appid=${API_KEY}`
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
  if (els.currentTime) {
    els.currentTime.textContent = formatTime(data.dt, timezoneOffset);
  }

  updateSunArc(data);
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

// Renders 3 days by default, 5 days when showFullForecast = true
function renderForecast(forecast) {
  const dailyMap = buildDailyForecastMap(forecast);
  const dates = Object.keys(dailyMap);

  const todayStr = new Date().toISOString().slice(0, 10);
  const nextDays = dates.filter((d) => d !== todayStr).slice(0, 5);

  const visibleDays = showFullForecast ? nextDays : nextDays.slice(0, 3);

  els.forecastList.innerHTML = "";

  visibleDays.forEach((dateStr, index) => {
    const entries = dailyMap[dateStr];

    const temps = entries.map((e) => e.main.temp);
    const min = Math.round(Math.min(...temps));
    const max = Math.round(Math.max(...temps));

    const midday =
      entries.find((e) => e.dt_txt.includes("12:00:00")) || entries[0];

    const main = midday.weather[0].main;
    const description = midday.weather[0].description;
    const iconName = getLucideIconName(main);

    const li = document.createElement("li");
    li.className = "forecast-item";

    const dateObj = new Date(dateStr);
    const dateLabel = dateObj.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
    });

    li.innerHTML = `
      <div class="forecast-left">
        <div class="forecast-icon-wrapper">
          <i data-lucide="${iconName}" class="forecast-icon"></i>
        </div>
        <div class="forecast-text">
          <p class="forecast-date">${dateLabel}</p>
          <p class="forecast-condition">${main}</p>
        </div>
      </div>
      <div class="forecast-right">
        <span class="forecast-temp-max">${max}°</span>
        <span class="forecast-temp-min"> / ${min}°</span>
      </div>
    `;

    els.forecastList.appendChild(li);

    // First visible next day = Tomorrow card
    if (index === 0) {
      els.tomorrowCity.textContent = forecast.city.name;
      els.tomorrowTemp.textContent = max;
      els.tomorrowDesc.textContent = main;
    }
  });

  // Initialize Lucide icons inside the forecast list
  if (window.lucide) {
    window.lucide.createIcons(els.forecastList);
  }

  // Update button label
  const nextBtn = document.getElementById("next5-btn");
  if (nextBtn) {
    const labelSpan = nextBtn.querySelector("span");
    if (labelSpan) {
      labelSpan.textContent = showFullForecast ? "Show Less" : "Next 5 Days";
    } else {
      nextBtn.textContent = showFullForecast ? "Show Less" : "Next 5 Days";
    }
  }
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

  // Collect data for each slot
  const slotData = slots.map((slot) => {
    const entry =
      todayData.find((item) => item.dt_txt.includes(slot.time)) ||
      todayData[todayData.length - 1];

    if (!entry) return null;

    const temp = Math.round(entry.main.temp);
    const main = entry.weather[0].main; // e.g. "Clear", "Clouds", etc.
    return {
      label: slot.label,
      temp,
      main,
    };
  });

  // Find hottest slot to highlight (like Afternoon in the reference)
  let hottestIndex = slotData.findIndex((d) => d !== null);
  if (hottestIndex === -1) {
    els.tempTimeline.innerHTML = "<p>No data for today</p>";
    return;
  }

  slotData.forEach((d, idx) => {
    if (!d) return;
    if (slotData[hottestIndex] && d.temp > slotData[hottestIndex].temp) {
      hottestIndex = idx;
    }
  });

  // Build UI
  const nodes = slotData
    .map((data, idx) => {
      if (!data) return "";
      const iconName = getLucideWeatherIcon(data.main);
      const isActive = idx === hottestIndex;
      const activeClass = isActive ? " timeline-item--active" : "";

      return `
        <div class="timeline-item${activeClass}">
          <div class="timeline-icon-wrapper">
            <i data-lucide="${iconName}" class="timeline-icon"></i>
          </div>
          <div class="timeline-temp">${data.temp}°C</div>
          <div class="timeline-label">${data.label}</div>
        </div>
      `;
    })
    .join("");

  els.tempTimeline.innerHTML = nodes;

  // Re-render Lucide icons for newly injected HTML
  if (window.lucide) {
    window.lucide.createIcons();
  }
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

/**
 * Animate the sun along the arc + daylight fill.
 * Uses sunrise, sunset, and current dt from the API (all in UTC seconds).
 */
function updateSunArc(data) {
  const sunArc = document.querySelector(".sun-arc");
  const sunCurve = document.querySelector(".sun-curve");
  const sunEmoji = document.getElementById("sun-emoji");
  if (!sunArc || !sunCurve || !sunEmoji) return;

  const sunrise = data.sys.sunrise;
  const sunset = data.sys.sunset;
  const now = data.dt;

  let progress;
  if (now <= sunrise) progress = 0;
  else if (now >= sunset) progress = 1;
  else progress = (now - sunrise) / (sunset - sunrise);

  const rect = sunCurve.getBoundingClientRect();
  const arcRect = sunArc.getBoundingClientRect();

  const width = rect.width;
  const height = rect.height; // radius
  const centerX = (rect.left - arcRect.left) + width / 2;
  const centerY = (rect.top - arcRect.top) + height;
  const radius = height;

  // smoother arc angle adjustment (small offset so emoji follows curve top perfectly)
  const theta = Math.PI * (1 - progress);
  const x = centerX + radius * Math.cos(theta);
  const y = centerY - radius * Math.sin(theta);

  // position sun slightly above the curve
  sunEmoji.style.left = `${x}px`;
  sunEmoji.style.top = `${y - 10}px`;
}










async function loadCity(city) {
  try {
    const weather = await fetchWeatherByCity(city);
    const { lat, lon } = weather.coord;

    const [forecast, airQuality] = await Promise.all([
      fetchForecastByCoords(lat, lon),
      fetchAirQuality(lat, lon),
    ]);

    // store latest forecast so the Next 5 Days button can re-render without refetch
    window._latestForecastData = forecast;

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
  // reset to 3-day view whenever a new city is searched
  showFullForecast = false;
  loadCity(city);
});

// Toggle 3-day / 5-day forecast
const next5Btn = document.getElementById("next5-btn");
if (next5Btn) {
  next5Btn.addEventListener("click", () => {
    showFullForecast = !showFullForecast;
    if (window._latestForecastData) {
      renderForecast(window._latestForecastData);
    }
  });
}

// Initial load
const lastCity = localStorage.getItem("lastCity") || "Delhi";
loadCity(lastCity);
