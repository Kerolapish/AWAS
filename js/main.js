// main.js
document.addEventListener("DOMContentLoaded", () => {
    const appContent = document.getElementById("app-content");
    // Page title and nav/logout may not exist in the simplified, weather-only UI.
    const pageTitleEl = document.getElementById("page-title");
    const navButtons = document.querySelectorAll(".nav-btn") || [];
    const logoutBtn = document.getElementById("logout-btn");
    
    // Notification System
    const notificationSystem = {
        container: null,
        init() {
            this.container = document.createElement('div');
            this.container.className = 'notification-panel';
            document.body.appendChild(this.container);
        },
        show(message, type = 'success', duration = 5000) {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerHTML = message;
            this.container.appendChild(notification);
            
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }
    };
    
    // Initialize notification system
    notificationSystem.init();
    
    // Weather Auto-Update
    let weatherUpdateInterval;
    const WEATHER_UPDATE_INTERVAL = 300000; // 5 minutes

    // --- Global State ---
    const pageTitles = {
        weather: "Weather Alerts",
        reminders: "Reminders",
        ledger: "Ledger",
        crops: "Crops Knowledge",
    };

    // --- Utility Functions ---
    const fetchWeatherData = async () => {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            const { latitude, longitude } = position.coords;
            return await api('get_weather', { params: { lat: latitude, lon: longitude } });
        } catch (err) {
            console.error('Weather fetch error:', err);
            return null;
        }
    };

    const updateWeatherDisplay = (weather, output) => {
        if (!weather || !output) return;

        const current = weather.current;
        let html = `
            <div class="weather-widget ${weather.alerts?.length ? 'alert' : ''}">
                <div class="weather-main">
                    <div>
                        <div class="weather-temp">${current.temp.toFixed(1)}°C</div>
                        <p>Feels like: ${current.feels_like.toFixed(1)}°C</p>
                    </div>
                    <img class="weather-icon" src="http://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png" 
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
                        `<p><strong>${escapeHTML(alert.event)}:</strong> ${escapeHTML(alert.description)}</p>`
                    ).join('')}
                </div>
            `;
            // Show notification for new alerts
            notificationSystem.show('⚠️ New weather alert! Check the weather page.', 'warning');
        }
        
        output.innerHTML = html;
    };

    const checkReminders = async () => {
        const result = await api('get_reminders');
        if (!result) return;
        
        const today = new Date();
        result.reminders.forEach(reminder => {
            const reminderDate = new Date(reminder.createdAt);
            if (reminderDate.toDateString() === today.toDateString()) {
                notificationSystem.show(`🔔 Reminder: ${reminder.text}`, 'success');
            }
        });
    };

    const api = async (action, options = {}) => {
        const { method = 'GET', body = null, params = {} } = options;
        
        let url = `api/api.php?action=${action}`;
        if (method === 'GET' && Object.keys(params).length > 0) {
            url += '&' + new URLSearchParams(params).toString();
        }

        const fetchOptions = {
            method: method,
            headers: {}
        };
        
        if (method === 'POST' && body) {
            fetchOptions.headers['Content-Type'] = 'application/json';
            fetchOptions.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, fetchOptions);
            const result = await response.json();
            
            // Check for authentication failure
            if (result.auth === false) {
                window.location.href = 'login.html';
                return null;
            }
            if (!result.success) {
                throw new Error(result.message);
            }
            return result;
        } catch (err) {
            showError(err.message);
            return null;
        }
    };

    const cloneTemplate = (id) => {
        return document.getElementById(id).content.cloneNode(true);
    };

    const showLoading = () => {
        appContent.innerHTML = '';
        appContent.appendChild(cloneTemplate('template-loading'));
    };

    const showError = (message) => {
        const errorPage = cloneTemplate('template-error');
        errorPage.querySelector('.error-full-page').textContent = message;
        appContent.innerHTML = '';
        appContent.appendChild(errorPage);
    };
    
    const escapeHTML = (str) => {
        return str.replace(/[&<>"']/g, (m) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[m]));
    };
    
    // --- Page Navigation ---
    const navigateTo = (pageId) => {
        navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === pageId);
        });
        if (pageTitleEl) pageTitleEl.textContent = pageTitles[pageId] || "Dashboard";
        
        // Load page content
        switch (pageId) {
            case 'weather':   loadWeather();   break;
            case 'reminders': loadReminders(); break;
            case 'ledger':    loadLedger();    break;
            case 'crops':     loadCrops();     break;
            default:          loadWeather();
        }
    };

    // --- Page Loaders ---
    
    // 1. WEATHER
    const loadWeather = async () => {
        showLoading();
        const page = cloneTemplate('template-weather');
        const output = page.querySelector('#weather-output');
        
        // Clear existing interval if any
        if (weatherUpdateInterval) {
            clearInterval(weatherUpdateInterval);
        }
        
        // Set up auto-update
        weatherUpdateInterval = setInterval(async () => {
            const weatherData = await fetchWeatherData();
            if (weatherData) {
                updateWeatherDisplay(weatherData, output);
            }
        }, WEATHER_UPDATE_INTERVAL);
        
    const fetchBtn = page.querySelector('#fetch-weather-btn');
    if (fetchBtn) fetchBtn.onclick = loadWeather;
        appContent.innerHTML = '';
        appContent.appendChild(page);

        try {
            const weatherData = await fetchWeatherData();
            if (weatherData) {
                updateWeatherDisplay(weatherData, output);
            }
        
            
            if (weather.alerts && weather.alerts.length > 0) {
                html += `
                    <div class="weather-alert">
                        <h4>Weather Alerts!</h4>
                        ${weather.alerts.map(alert => 
                            `<p><strong>${escapeHTML(alert.event)}:</strong> ${escapeHTML(alert.description)}</p>`
                        ).join('')}
                    </div>
                `;
            }
            output.innerHTML = html;
            
        } catch (err) {
            output.innerHTML = `<p class="error">Could not get location. Please enable it in your browser.</p>`;
        }
    };
    
    // 2. REMINDERS
    const loadReminders = async () => {
        showLoading();
        const page = cloneTemplate('template-reminders');
        const listEl = page.querySelector('#reminder-list');

        const reminderForm = page.querySelector('#reminder-form');
        const reminderInput = page.querySelector('#reminder-text');
        if (reminderForm) {
            reminderForm.onsubmit = async (e) => {
                e.preventDefault();
                if (!reminderInput || !reminderInput.value) return;

                const result = await api('add_reminder', {
                    method: 'POST',
                    body: { text: reminderInput.value }
                });

                if (result) {
                    reminderInput.value = '';
                    loadReminders(); // Refresh
                }
            };
        }
        
        appContent.innerHTML = '';
        appContent.appendChild(page);
        
        const result = await api('get_reminders');
        if (!result) return;
        
        if (result.reminders.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color: var(--text-light);">No reminders set.</p>';
            return;
        }
        
        listEl.innerHTML = '';
        result.reminders.forEach(r => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div><p>${escapeHTML(r.text)}</p><span>${new Date(r.createdAt).toLocaleString()}</span></div>
                <button class="delete-btn" data-id="${r.id}">&times;</button>
            `;
            item.querySelector('.delete-btn').onclick = async (e) => {
                const id = e.target.dataset.id;
                if (confirm('Delete this reminder?')) {
                    await api('delete_reminder', { params: { id } });
                    loadReminders(); // Refresh
                }
            };
            listEl.appendChild(item);
        });
    };
    
    // 3. LEDGER
    const loadLedger = async () => {
        showLoading();
        const page = cloneTemplate('template-ledger');
        const listEl = page.querySelector('#ledger-list');
        const chartEl = page.querySelector('#profit-chart');

        // Set date to today
        const ledgerDate = page.querySelector('#ledger-date');
        if (ledgerDate) ledgerDate.valueAsDate = new Date();

        // Handle form submission
        const ledgerForm = page.querySelector('#ledger-form');
        if (ledgerForm) {
            ledgerForm.onsubmit = async (e) => {
                e.preventDefault();
                const data = {
                    crop: page.querySelector('#ledger-crop')?.value,
                    revenue: page.querySelector('#ledger-revenue')?.value,
                    cost: page.querySelector('#ledger-cost')?.value,
                    date: page.querySelector('#ledger-date')?.value
                };
                if (!data.crop || !data.date) return;

                await api('add_ledger', { method: 'POST', body: data });
                loadLedger(); // Refresh
            };
        }
        
        appContent.innerHTML = '';
        appContent.appendChild(page);
        
        const result = await api('get_ledger');
        if (!result) return;
        
        // Render Profit Chart
        if (result.profits.length === 0) {
            chartEl.innerHTML = '<p style="text-align:center; font-size: 14px; color: var(--text-light);">No profit data yet.</p>';
        } else {
            const maxProfit = Math.max(...result.profits.map(p => p.profit));
            chartEl.innerHTML = result.profits.map(p => {
                const width = (p.profit / maxProfit) * 100;
                return `
                    <div class="chart-bar">
                        <span class="chart-bar-label">${escapeHTML(p.crop)}</span>
                        <div class="chart-bar-bg">
                            <div class="chart-bar-fill" style="width: ${width > 0 ? width : 0}%"></div>
                        </div>
                        <span class="chart-bar-value">RM ${parseFloat(p.profit).toFixed(2)}</span>
                    </div>
                `;
            }).join('');
        }
        
        // Render Ledger List
        if (result.entries.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color: var(--text-light);">No ledger entries.</p>';
            return;
        }
        listEl.innerHTML = '';
        result.entries.forEach(e => {
            const item = document.createElement('div');
            item.className = 'list-item';
            const profit = parseFloat(e.revenue) - parseFloat(e.cost);
            item.innerHTML = `
                <div>
                    <p style="font-weight: 600;">${escapeHTML(e.crop)}</p>
                    <span style="color: ${profit >= 0 ? 'var(--primary-dark)' : 'var(--error-color)'}; font-weight: 600;">
                        Profit: RM ${profit.toFixed(2)}
                    </span>
                    <br><span>${e.date} | Rev: RM ${e.revenue} | Cost: RM ${e.cost}</span>
                </div>
                <button class="delete-btn" data-id="${e.id}">&times;</button>
            `;
            item.querySelector('.delete-btn').onclick = async (e) => {
                const id = e.target.closest('.delete-btn').dataset.id;
                if (confirm('Delete this entry?')) {
                    await api('delete_ledger', { params: { id } });
                    loadLedger(); // Refresh
                }
            };
            listEl.appendChild(item);
        });
    };
    
    // 4. CROPS
    const loadCrops = async () => {
        showLoading();
        const page = cloneTemplate('template-crops');
        const listEl = page.getElementById('crop-list');
        
        appContent.innerHTML = '';
        appContent.appendChild(page);

        const result = await api('get_crops');
        if (!result) return;
        
        if (result.crops.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color: var(--text-light);">No crop data found.</p>';
            return;
        }
        
        listEl.innerHTML = '';
        result.crops.forEach(crop => {
            const item = document.createElement('div');
            item.className = 'crop-item-card';
            item.dataset.id = crop.id;
            item.innerHTML = `
                <img src="${escapeHTML(crop.image || '')}" alt="${escapeHTML(crop.name)}" onerror="this.style.display='none'">
                <div style="flex: 1;">
                    <p style="margin:0; font-weight: 600;">${escapeHTML(crop.name)}</p>
                    <span style="font-size: 14px; color: var(--text-light);">${escapeHTML(crop.bestSeason)}</span>
                </div>
                <span>&rarr;</span>
            `;
            item.onclick = () => loadCropDetail(crop.id);
            listEl.appendChild(item);
        });
    };
    
    const loadCropDetail = async (id) => {
        showLoading();
        const result = await api('get_crop_detail', { params: { id } });
        if (!result) return;
        
        const crop = result.crop;
    const page = cloneTemplate('template-crop-detail');

    const backBtn = page.querySelector('.btn-back');
    if (backBtn) backBtn.onclick = () => navigateTo('crops');
    const imgEl = page.querySelector('#crop-image'); if (imgEl) imgEl.src = crop.image || '';
    const nameEl = page.querySelector('#crop-name'); if (nameEl) nameEl.textContent = crop.name;
    const seasonEl = page.querySelector('#crop-season'); if (seasonEl) seasonEl.textContent = crop.bestSeason;
    const wateringEl = page.querySelector('#crop-watering'); if (wateringEl) wateringEl.textContent = crop.watering;
    const costEl = page.querySelector('#crop-cost'); if (costEl) costEl.textContent = parseFloat(crop.avgCost).toFixed(2);
    const revenueEl = page.querySelector('#crop-revenue'); if (revenueEl) revenueEl.textContent = parseFloat(crop.avgRevenue).toFixed(2);
    const profitEl = page.querySelector('#crop-profit'); if (profitEl) profitEl.textContent = parseFloat(crop.profitMargin).toFixed(1);

    const diseasesList = page.querySelector('#crop-diseases');
        diseasesList.innerHTML = '';
        // Assuming diseases are stored as comma-separated string
        const diseases = crop.diseases ? crop.diseases.split(',') : [];
        if (diseases.length > 0) {
            diseases.forEach(d => {
                const li = document.createElement('li');
                li.textContent = escapeHTML(d.trim());
                diseasesList.appendChild(li);
            });
        } else {
            diseasesList.innerHTML = '<li>No common diseases listed.</li>';
        }
        
        appContent.innerHTML = '';
        appContent.appendChild(page);
    };
    
    // --- INIT ---
    // Authentication is disabled; initialize app directly.
    const initApp = async () => {
        navigateTo('weather'); // Start on weather page

        // Set up periodic checks
        setInterval(checkReminders, 60000); // Check reminders every minute

        // Initial reminder check
        checkReminders();

        // Wire nav buttons safely
        navButtons.forEach(btn => {
            btn.onclick = () => navigateTo(btn.dataset.page);
        });

        if (logoutBtn) {
            logoutBtn.onclick = async (e) => {
                e.preventDefault();
                if (weatherUpdateInterval) clearInterval(weatherUpdateInterval);
                try { await api('logout'); } catch (e) { /* ignore */ }
                window.location.href = 'login.html';
            };
        }
    };

    initApp();
});