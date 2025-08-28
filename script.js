class StockPredictionGame {
    constructor() {
        this.apiKey = 'ONLJK4AZZLQN93EH';
        this.currentTicker = '';
        this.stockData = {};
        this.gameData = [];
        this.currentDate = null;
        this.startDate = null;
        this.score = 0;
        this.chart = null;
        this.gameStarted = false;
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('submit-ticker').addEventListener('click', () => this.handleTickerSubmission());
        document.getElementById('stock-ticker').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleTickerSubmission();
        });
        document.getElementById('predict-up').addEventListener('click', () => this.makePrediction('up'));
        document.getElementById('predict-down').addEventListener('click', () => this.makePrediction('down'));
        document.getElementById('continue-game').addEventListener('click', () => this.continueGame());
        document.getElementById('new-game').addEventListener('click', () => this.resetGame());
        
        // Add event listeners for ticker example buttons
        document.querySelectorAll('.ticker-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ticker = e.target.getAttribute('data-ticker');
                document.getElementById('stock-ticker').value = ticker;
                this.handleTickerSubmission();
            });
        });
        
        // Add test connection button
        document.getElementById('test-connection').addEventListener('click', () => this.testConnection());
    }

    async handleTickerSubmission() {
        const ticker = document.getElementById('stock-ticker').value.trim().toUpperCase();
        if (!ticker) {
            this.showError('Please enter a stock ticker symbol');
            return;
        }

        this.currentTicker = ticker;
        this.showSection('loading-section');
        
        try {
            await this.fetchStockData(ticker);
            await this.startGame();
        } catch (error) {
            this.showError(error.message);
            this.showSection('stock-input-section');
        }
    }

    async fetchStockData(ticker) {
        console.log(`Fetching stock data for: ${ticker}`);
        
        // Try multiple approaches with better error handling
        const methods = [
            { name: 'AllOrigins', url: 'https://api.allorigins.win/get?url=' },
            { name: 'Corsproxy.io', url: 'https://corsproxy.io/?' },
            { name: 'CORS-Anywhere', url: 'https://cors-anywhere.herokuapp.com/' },
            { name: 'ThingProxy', url: 'https://thingproxy.freeboard.io/fetch/' },
            { name: 'Direct (may fail)', url: '' }
        ];
        
        const apiUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${this.apiKey}&outputsize=full`;
        
        for (let i = 0; i < methods.length; i++) {
            try {
                console.log(`Trying method ${i + 1}: ${methods[i].name}`);
                let url, response, data;
                
                if (i === 0) {
                    // AllOrigins method
                    url = methods[i].url + encodeURIComponent(apiUrl);
                    console.log(`Making request to: ${url}`);
                    response = await fetch(url, { 
                        method: 'GET',
                        headers: { 'Accept': 'application/json' }
                    });
                    if (!response.ok) {
                        console.log(`${methods[i].name} failed with status: ${response.status}`);
                        continue;
                    }
                    const result = await response.json();
                    if (!result.contents) {
                        console.log(`${methods[i].name} returned no contents`);
                        continue;
                    }
                    data = JSON.parse(result.contents);
                } else if (i === 4) {
                    // Direct method (last resort)
                    console.log(`Making direct request to: ${apiUrl}`);
                    response = await fetch(apiUrl);
                    if (!response.ok) {
                        console.log(`Direct method failed with status: ${response.status}`);
                        continue;
                    }
                    data = await response.json();
                } else {
                    // Proxy methods
                    url = methods[i].url + apiUrl;
                    console.log(`Making request to: ${url}`);
                    response = await fetch(url, {
                        method: 'GET',
                        headers: methods[i].name === 'CORS-Anywhere' ? { 'X-Requested-With': 'XMLHttpRequest' } : {}
                    });
                    if (!response.ok) {
                        console.log(`${methods[i].name} failed with status: ${response.status}`);
                        continue;
                    }
                    data = await response.json();
                }
                
                console.log(`${methods[i].name} response:`, data);
                
                // Validate the response
                if (data['Error Message']) {
                    const suggestions = this.getSuggestions(ticker);
                    throw new Error(`Invalid stock ticker "${ticker}". Please enter a valid stock symbol.${suggestions}`);
                }
                
                if (data['Note']) {
                    throw new Error('API call limit reached. Please try again in a minute.');
                }
                
                if (data['Information']) {
                    throw new Error('API call frequency limit reached. Please wait a minute and try again.');
                }
                
                if (!data['Time Series (Daily)']) {
                    console.log(`${methods[i].name}: No Time Series data found in response`);
                    if (i === methods.length - 1) {
                        throw new Error(`Unable to fetch data for "${ticker}". Please check the ticker symbol or try again later.`);
                    }
                    continue; // Try next method
                }
                
                console.log(`✅ Successfully fetched data using ${methods[i].name}`);
                this.stockData = data['Time Series (Daily)'];
                this.clearError();
                return; // Success!
                
            } catch (error) {
                console.log(`❌ ${methods[i].name} error:`, error.message);
                
                // If this is a specific API error (not network), don't continue
                if (error.message.includes('Invalid stock ticker') || 
                    error.message.includes('API call limit')) {
                    throw error;
                }
                
                if (i === methods.length - 1) {
                    // All methods failed
                    throw new Error(`Unable to load stock data for "${ticker}". This could be due to:\n1. Network connectivity issues\n2. CORS proxy services being down\n3. API rate limits\n\nPlease try:\n• Refreshing the page\n• Using a different browser\n• Trying again in a few minutes`);
                }
                // Continue to next method
                continue;
            }
        }
    }

    generateRandomStartDate() {
        console.log('Generating random start date...');
        
        // Get all available dates and sort them
        const availableDates = Object.keys(this.stockData).sort().reverse();
        console.log('Total available dates:', availableDates.length);
        console.log('Date range:', availableDates[availableDates.length - 1], 'to', availableDates[0]);
        
        if (availableDates.length < 10) {
            console.log('Not enough historical data, using most recent date');
            return new Date(availableDates[availableDates.length - 1]);
        }
        
        // Find dates that are at least 1 week old but not more than 100 days old
        const today = new Date();
        const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const hundredDaysAgo = new Date(today.getTime() - 100 * 24 * 60 * 60 * 1000);
        
        const eligibleDates = availableDates.filter(dateStr => {
            const date = new Date(dateStr);
            return date <= oneWeekAgo && date >= hundredDaysAgo;
        });
        
        console.log('Eligible dates for random selection:', eligibleDates.length);
        
        if (eligibleDates.length === 0) {
            // Fallback: use any date that has enough future data
            console.log('No eligible dates in preferred range, using fallback');
            for (let i = availableDates.length - 10; i >= 0; i--) {
                const testDate = new Date(availableDates[i]);
                if (this.hasEnoughFutureData(testDate, availableDates)) {
                    return testDate;
                }
            }
            // Last resort: use a date from middle of available data
            const midIndex = Math.floor(availableDates.length / 2);
            return new Date(availableDates[midIndex]);
        }
        
        // Pick a random date from eligible dates
        const randomIndex = Math.floor(Math.random() * eligibleDates.length);
        const selectedDate = new Date(eligibleDates[randomIndex]);
        console.log('Selected random date:', this.formatDate(selectedDate));
        
        return selectedDate;
    }
    
    hasEnoughFutureData(startDate, availableDates) {
        const startDateStr = this.formatDate(startDate);
        const futureIndex = availableDates.indexOf(startDateStr);
        return futureIndex >= 5; // Need at least 5 future data points
    }



    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    async startGame() {
        console.log('Starting game...');
        console.log('Available stock dates:', Object.keys(this.stockData).slice(0, 10));
        
        this.startDate = this.generateRandomStartDate();
        console.log('Generated start date:', this.formatDate(this.startDate));
        
        this.currentDate = new Date(this.startDate);
        this.score = 0;
        this.gameStarted = true;
        
        // Prepare initial game data (7 days before start date + start date)
        this.gameData = this.prepareInitialData();
        console.log('Prepared game data length:', this.gameData.length);
        console.log('Game data:', this.gameData);
        
        if (this.gameData.length < 7) {
            console.log('Insufficient data, trying alternative approach...');
            // Try to use more recent data instead
            this.gameData = this.prepareAlternativeData();
            if (this.gameData.length < 7) {
                throw new Error('Insufficient data for the selected period. Please try a different stock.');
            }
        }
        
        this.updateGameDisplay();
        this.createChart();
        this.showSection('game-section');
    }

    prepareInitialData() {
        const data = [];
        const tempDate = new Date(this.startDate);
        
        // Go back up to 15 trading days to find 7 data points
        for (let i = 15; i >= 0; i--) {
            const checkDate = new Date(tempDate.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = this.formatDate(checkDate);
            
            console.log(`Checking date: ${dateStr}, has data: ${!!this.stockData[dateStr]}`);
            
            if (this.stockData[dateStr]) {
                data.push({
                    date: dateStr,
                    price: parseFloat(this.stockData[dateStr]['4. close']),
                    open: parseFloat(this.stockData[dateStr]['1. open']),
                    high: parseFloat(this.stockData[dateStr]['2. high']),
                    low: parseFloat(this.stockData[dateStr]['3. low'])
                });
                
                // Stop when we have enough data points
                if (data.length >= 8) break;
            }
        }
        
        return data;
    }
    
    prepareAlternativeData() {
        // Fallback: use the most recent available data
        const availableDates = Object.keys(this.stockData).sort().reverse();
        const data = [];
        
        console.log('Using alternative data approach with dates:', availableDates.slice(0, 10));
        
        for (let i = 0; i < Math.min(10, availableDates.length); i++) {
            const dateStr = availableDates[i];
            data.push({
                date: dateStr,
                price: parseFloat(this.stockData[dateStr]['4. close']),
                open: parseFloat(this.stockData[dateStr]['1. open']),
                high: parseFloat(this.stockData[dateStr]['2. high']),
                low: parseFloat(this.stockData[dateStr]['3. low'])
            });
        }
        
        // Reverse to get chronological order (oldest first)
        data.reverse();
        
        // Update start date to match the data we're using
        if (data.length > 0) {
            this.startDate = new Date(data[data.length - 1].date);
            this.currentDate = new Date(this.startDate);
            console.log('Updated start date to:', this.formatDate(this.startDate));
        }
        
        return data;
    }

    updateGameDisplay() {
        document.getElementById('current-stock').textContent = `Stock: ${this.currentTicker}`;
        document.getElementById('current-date').textContent = `Current Date: ${this.formatDisplayDate(this.currentDate)}`;
        document.getElementById('current-score').textContent = `Score: ${this.score}`;
    }

    formatDisplayDate(date) {
        return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    createChart() {
        const ctx = document.getElementById('stock-chart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.gameData.map(d => new Date(d.date).toLocaleDateString()),
                datasets: [{
                    label: `${this.currentTicker} Stock Price`,
                    data: this.gameData.map(d => d.price),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.1,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `${this.currentTicker} Stock Price History`,
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Price ($)'
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    }
                },
                elements: {
                    point: {
                        hoverRadius: 8
                    }
                }
            }
        });
    }

    async makePrediction(direction) {
        // Disable prediction buttons
        document.getElementById('predict-up').disabled = true;
        document.getElementById('predict-down').disabled = true;
        
        // Get next day's data
        const nextDate = this.getNextTradingDay();
        const nextDateStr = this.formatDate(nextDate);
        
        if (!this.stockData[nextDateStr]) {
            this.showError('No data available for the next trading day. Game ended.');
            return;
        }
        
        const currentPrice = this.gameData[this.gameData.length - 1].price;
        const nextPrice = parseFloat(this.stockData[nextDateStr]['4. close']);
        
        const actualDirection = nextPrice > currentPrice ? 'up' : 'down';
        const isCorrect = direction === actualDirection;
        
        if (isCorrect) {
            this.score++;
        }
        
        // Update current date to the next day
        this.currentDate = nextDate;
        
        // Add new data point to game data
        this.gameData.push({
            date: nextDateStr,
            price: nextPrice,
            open: parseFloat(this.stockData[nextDateStr]['1. open']),
            high: parseFloat(this.stockData[nextDateStr]['2. high']),
            low: parseFloat(this.stockData[nextDateStr]['3. low'])
        });
        
        // Update chart with new data
        this.updateChart();
        
        // Show result
        this.showPredictionResult(isCorrect, currentPrice, nextPrice, direction, actualDirection);
        
        // Update display
        this.updateGameDisplay();
        
        // Show result section
        document.getElementById('result-section').classList.remove('hidden');
    }

    getNextTradingDay() {
        const nextDay = new Date(this.currentDate.getTime() + 24 * 60 * 60 * 1000);
        
        // Skip weekends
        while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
            nextDay.setDate(nextDay.getDate() + 1);
        }
        
        return nextDay;
    }

    updateChart() {
        this.chart.data.labels = this.gameData.map(d => new Date(d.date).toLocaleDateString());
        this.chart.data.datasets[0].data = this.gameData.map(d => d.price);
        this.chart.update('active');
    }

    showPredictionResult(isCorrect, oldPrice, newPrice, prediction, actual) {
        const resultDiv = document.getElementById('prediction-result');
        const priceChange = ((newPrice - oldPrice) / oldPrice * 100).toFixed(2);
        const priceChangeStr = priceChange > 0 ? `+${priceChange}%` : `${priceChange}%`;
        
        if (isCorrect) {
            resultDiv.className = 'result-correct';
            resultDiv.innerHTML = `
                <h3>🎉 Correct!</h3>
                <p>You predicted the price would go <strong>${prediction}</strong> and you were right!</p>
                <p>Price changed from $${oldPrice.toFixed(2)} to $${newPrice.toFixed(2)} (${priceChangeStr})</p>
                <p>Score: +1 point</p>
            `;
        } else {
            resultDiv.className = 'result-incorrect';
            resultDiv.innerHTML = `
                <h3>❌ Incorrect</h3>
                <p>You predicted the price would go <strong>${prediction}</strong>, but it went <strong>${actual}</strong>.</p>
                <p>Price changed from $${oldPrice.toFixed(2)} to $${newPrice.toFixed(2)} (${priceChangeStr})</p>
                <p>Score: +0 points</p>
            `;
        }
    }

    continueGame() {
        // Hide result section
        document.getElementById('result-section').classList.add('hidden');
        
        // Re-enable prediction buttons
        document.getElementById('predict-up').disabled = false;
        document.getElementById('predict-down').disabled = false;
        
        // Check if we can continue (need data for next day)
        const nextDate = this.getNextTradingDay();
        const nextDateStr = this.formatDate(nextDate);
        
        if (!this.stockData[nextDateStr]) {
            this.showError('No more data available. Game ended.');
            document.getElementById('new-game').click();
            return;
        }
    }

    resetGame() {
        this.currentTicker = '';
        this.stockData = {};
        this.gameData = [];
        this.currentDate = null;
        this.startDate = null;
        this.score = 0;
        this.gameStarted = false;
        
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        
        document.getElementById('stock-ticker').value = '';
        document.getElementById('result-section').classList.add('hidden');
        document.getElementById('predict-up').disabled = false;
        document.getElementById('predict-down').disabled = false;
        
        this.clearError();
        this.showSection('stock-input-section');
    }

    showSection(sectionId) {
        const sections = ['stock-input-section', 'game-section', 'loading-section'];
        sections.forEach(id => {
            const element = document.getElementById(id);
            if (id === sectionId) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        });
    }

    showError(message) {
        document.getElementById('ticker-error').textContent = message;
    }

    getSuggestions(ticker) {
        const commonMistakes = {
            'APPL': 'AAPL (Apple)',
            'GOGGLE': 'GOOGL (Google)',
            'TESLE': 'TSLA (Tesla)',
            'MICROS': 'MSFT (Microsoft)',
            'AMAZN': 'AMZN (Amazon)',
            'META': 'META (Meta/Facebook)',
            'NVIDI': 'NVDA (NVIDIA)'
        };
        
        if (commonMistakes[ticker]) {
            return ` Did you mean ${commonMistakes[ticker]}?`;
        }
        
        // Check for similar tickers
        const popular = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA', 'META'];
        for (const stock of popular) {
            if (this.isClose(ticker, stock)) {
                return ` Did you mean ${stock}?`;
            }
        }
        
        return ' Try: AAPL, MSFT, GOOGL, TSLA, AMZN, or NVDA.';
    }
    
    isClose(str1, str2) {
        // Simple similarity check
        const len1 = str1.length;
        const len2 = str2.length;
        
        if (Math.abs(len1 - len2) > 1) return false;
        
        let differences = 0;
        const maxLen = Math.max(len1, len2);
        
        for (let i = 0; i < maxLen; i++) {
            if (str1[i] !== str2[i]) differences++;
            if (differences > 1) return false;
        }
        
        return differences <= 1;
    }

    async testConnection() {
        console.log('Testing API connection...');
        this.showError('Testing connection to Alpha Vantage API...');
        
        try {
            await this.fetchStockData('AAPL');
            this.showError('✅ API Connection successful! Try entering a stock ticker.');
        } catch (error) {
            console.log('Connection test failed:', error);
            this.showError(`❌ Connection test failed: ${error.message}`);
        }
    }

    clearError() {
        document.getElementById('ticker-error').textContent = '';
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new StockPredictionGame();
});