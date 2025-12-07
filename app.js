const BASE_URL = "https://api.openweathermap.org/data/2.5";

const elements = {
  searchForm: document.getElementById("search-form"),
  searchInput: document.getElementById("search-input"),
  tempValue: document.getElementById("temp-value"),
  weatherDesc: document.getElementById("weather-desc"),
  weatherLocation: document.getElementById("weather-location"),
  pressure: document.getElementById("pressure"),
  visibility: document.getElementById("visibility"),
  humidity: document.getElementById("humidity"),
  aqiNumber: document.getElementById("aqi-number"),
  aqiStatus: document.getElementById("aqi-status"),
  aqiIndicator: document.getElementById("aqi-indicator"),
  forecastList: document.getElementById("forecast-list"),
  tempTimeline: document.getElementById("temp-timeline"),
};

async function fetchJSON(url, fallbackMessage = "Something went wrong") {
  const res = await fetch(url);
  // Try to parse JSON even when not ok so we can read the message
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const apiMsg = data && data.message ? data.message : null;
    throw new Error(apiMsg || fallbackMessage);
  }
  return data;
}

async function fetchWeatherByCity(city) {
  const url = `${BASE_URL}/weather?q=${encodeURIComponent(
    city
    )}&units=metric&appid=${API_KEY}`;
  return fetchJSON(url, "Failed to fetch current weather");
}

async function fetchForecastByCoords(lat, lon) {
  const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
  return fetchJSON(url, "Failed to fetch forecast");
}

async function fetchAirQuality(lat, lon) {
  const url = `${BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
  return fetchJSON(url, "Failed to fetch air quality");
}


function renderCurrentWeather(data) {
  elements.tempValue.textContent = Math.round(data.main.temp);
  elements.weatherDesc.textContent = data.weather[0].description;
  elements.weatherLocation.textContent = data.name;
  elements.pressure.textContent = data.main.pressure;
  elements.visibility.textContent = (data.visibility / 1000).toFixed(1);
  elements.humidity.textContent = data.main.humidity;
}

function renderForecast(forecast) {
  // build 5-day list grouped by day
}

function renderAQI(aqiData) {
  const aqi = aqiData.list[0].main.aqi;
  elements.aqiNumber.textContent = aqi;
  // Map 1–5 to labels + bar position
}

async function loadCity(city) {
  try {
    // show loader if you add one
    const weather = await fetchWeatherByCity(city);
    const { lat, lon } = weather.coord;
    const [forecast, aqi] = await Promise.all([
      fetchForecastByCoords(lat, lon),
      fetchAirQuality(lat, lon),
    ]);

    renderCurrentWeather(weather);
    renderForecast(forecast);
    renderAQI(aqi);

    localStorage.setItem("lastCity", city);
  } catch (err) {
    alert(err.message || "Something went wrong");
  }
}

elements.searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = elements.searchInput.value.trim();
  if (!city) return;
  loadCity(city);
});

const lastCity = localStorage.getItem("lastCity") || "Delhi";
loadCity(lastCity);
