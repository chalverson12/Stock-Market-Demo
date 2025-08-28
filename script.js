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
        const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${this.apiKey}&outputsize=full`;
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Network error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data['Error Message']) {
                throw new Error(`Invalid stock ticker "${ticker}". Please enter a valid stock symbol.`);
            }
            
            if (data['Note']) {
                throw new Error('API call limit reached. Please try again in a minute.');
            }
            
            if (data['Information']) {
                throw new Error('API call frequency limit reached. Please wait a minute and try again.');
            }
            
            if (!data['Time Series (Daily)']) {
                throw new Error(`Unable to fetch data for "${ticker}". Please check the ticker symbol or try again later.`);
            }
            
            this.stockData = data['Time Series (Daily)'];
            this.clearError();
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network connection error. Please check your internet connection and try again.');
            }
            throw error;
        }
    }

    generateRandomStartDate() {
        const today = new Date();
        const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const hundredDaysAgo = new Date(today.getTime() - 100 * 24 * 60 * 60 * 1000);
        
        // Generate random date between 1 week and 100 days ago
        const timeDiff = oneWeekAgo.getTime() - hundredDaysAgo.getTime();
        const randomTime = Math.random() * timeDiff;
        const randomDate = new Date(hundredDaysAgo.getTime() + randomTime);
        
        // Ensure it's a weekday (Monday = 1, Friday = 5)
        while (randomDate.getDay() === 0 || randomDate.getDay() === 6) {
            randomDate.setDate(randomDate.getDate() - 1);
        }
        
        // Check if we have data for this date, if not, find the nearest available date
        const dateStr = this.formatDate(randomDate);
        if (!this.stockData[dateStr]) {
            return this.findNearestAvailableDate(randomDate);
        }
        
        return randomDate;
    }

    findNearestAvailableDate(targetDate) {
        const availableDates = Object.keys(this.stockData).sort().reverse();
        const targetStr = this.formatDate(targetDate);
        
        // Find the closest date that's before or equal to our target
        for (const dateStr of availableDates) {
            if (dateStr <= targetStr) {
                const date = new Date(dateStr);
                // Ensure it's a weekday
                if (date.getDay() !== 0 && date.getDay() !== 6) {
                    return date;
                }
            }
        }
        
        // Fallback: use the oldest available date
        return new Date(availableDates[availableDates.length - 1]);
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    async startGame() {
        this.startDate = this.generateRandomStartDate();
        this.currentDate = new Date(this.startDate);
        this.score = 0;
        this.gameStarted = true;
        
        // Prepare initial game data (7 days before start date + start date)
        this.gameData = this.prepareInitialData();
        
        if (this.gameData.length < 8) {
            throw new Error('Insufficient data for the selected period. Please try a different stock.');
        }
        
        this.updateGameDisplay();
        this.createChart();
        this.showSection('game-section');
    }

    prepareInitialData() {
        const data = [];
        const tempDate = new Date(this.startDate);
        
        // Go back 7 days to get initial data
        for (let i = 7; i >= 0; i--) {
            const checkDate = new Date(tempDate.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = this.formatDate(checkDate);
            
            if (this.stockData[dateStr]) {
                data.push({
                    date: dateStr,
                    price: parseFloat(this.stockData[dateStr]['4. close']),
                    open: parseFloat(this.stockData[dateStr]['1. open']),
                    high: parseFloat(this.stockData[dateStr]['2. high']),
                    low: parseFloat(this.stockData[dateStr]['3. low'])
                });
            }
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

    clearError() {
        document.getElementById('ticker-error').textContent = '';
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new StockPredictionGame();
});