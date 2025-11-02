document.addEventListener('DOMContentLoaded', () => {
    const fetchWeatherBtn = document.getElementById('fetch-weather-btn');
    const weatherOutput = document.getElementById('weather-output');

    const getWeatherData = async (latitude, longitude) => {
        try {
            const response = await fetch(`http://localhost/AWAS/api/weather.php?lat=${latitude}&lon=${longitude}`);
            if (!response.ok) {
                throw new Error('Weather service not available');
            }
            return await response.json();
        } catch (err) {
            console.error('Weather fetch error:', err);
            throw err;
        }
    };

    const displayWeather = (weather) => {
        const current = weather.current;
        let html = `
            <div class="weather-widget ${weather.alerts?.length ? 'alert' : ''}">
                <div class="weather-main">
                    <div>
                        <div class="weather-temp">${current.temp.toFixed(1)}°C</div>
                        <p>Feels like: ${current.feels_like.toFixed(1)}°C</p>
                        <p style="text-transform: capitalize;">${current.weather[0].description}</p>
                    </div>
                    <img class="weather-icon" 
                         src="http://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png" 
                         alt="${current.weather[0].description}">
                </div>
                <div class="weather-details">
                    <div class="weather-detail-item">
                        <strong>Humidity</strong>
                        <p>${current.humidity}%</p>
                    </div>
                    <div class="weather-detail-item">
                        <strong>Wind</strong>
                        <p>${current.wind_speed} m/s</p>
                    </div>
                </div>
            </div>
        `;
        
        if (weather.alerts?.length) {
            html += `
                <div class="weather-alert">
                    <h4>⚠️ Weather Alerts!</h4>
                    ${weather.alerts.map(alert => 
                        `<p><strong>${alert.event}:</strong> ${alert.description}</p>`
                    ).join('')}
                </div>
            `;
        }
        
        weatherOutput.innerHTML = html;
    };

    const updateWeather = async () => {
        try {
            weatherOutput.innerHTML = '<div class="loading-spinner"></div>';
            
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            
            const weather = await getWeatherData(position.coords.latitude, position.coords.longitude);
            displayWeather(weather);
            
        } catch (err) {
            weatherOutput.innerHTML = `
                <div class="error-message">
                    ${err.message === 'User denied Geolocation' 
                        ? 'Please enable location access to see weather information.'
                        : 'Could not fetch weather data. Please try again later.'}
                </div>
            `;
        }
    };

    // Event listeners
    fetchWeatherBtn.addEventListener('click', updateWeather);
    
    // Initial weather fetch
    updateWeather();
    
    // Auto-update weather every 5 minutes
    setInterval(updateWeather, 300000);
});