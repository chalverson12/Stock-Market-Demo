# 📈 Stock Market Prediction Game

A fun and educational web-based game where you predict stock price movements using real market data from Alpha Vantage API.

## 🎮 How to Play

1. **Enter a Stock Ticker**: Input any valid stock ticker symbol (e.g., MSFT, AAPL, GOOGL)
2. **View Historical Data**: See a chart showing 7 days of historical price data
3. **Make Predictions**: Predict whether the stock price will go up or down the next day
4. **Track Your Score**: Earn points for correct predictions and see how well you can predict the market!

## 🚀 Features

- **Real Stock Data**: Uses Alpha Vantage API for authentic market data
- **Interactive Charts**: Beautiful line charts powered by Chart.js
- **Smart Date Selection**: Automatically generates random weekday start dates
- **Responsive Design**: Works great on desktop and mobile devices
- **Score Tracking**: Keep track of your prediction accuracy

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Charts**: Chart.js
- **API**: Alpha Vantage Stock Market API
- **Deployment**: GitHub Pages

## 🎯 Live Demo

Play the game at: [Your GitHub Pages URL]

## 🔧 Local Development

1. Clone this repository
2. Open `index.html` in your web browser
3. Start playing!

No build process or dependencies required - it's a pure client-side application.

## 🔧 Troubleshooting

### Stock Data Not Loading?

Due to browser security policies (CORS), direct API calls from GitHub Pages can sometimes be blocked. The app uses multiple fallback proxy servers to resolve this issue. If you encounter problems:

1. **Check Browser Console**: Open Developer Tools (F12) and check the console for error messages
2. **Try Different Stock Symbols**: Start with common symbols like MSFT, AAPL, or GOOGL
3. **Refresh the Page**: Sometimes a simple refresh resolves temporary network issues
4. **Try a Different Browser**: Some browsers handle CORS differently
5. **Wait and Retry**: If you see API limit messages, wait a minute and try again

### For Developers

The app attempts to use these CORS proxy services in order:
1. `api.allorigins.win` - Most reliable
2. `cors-anywhere.herokuapp.com` - Requires activation
3. `thingproxy.freeboard.io` - Backup option

Console logging is enabled to help debug issues. Check the browser console for detailed error information.

## 📊 API Information

This game uses the Alpha Vantage API to fetch real stock market data. The API provides:
- Daily stock prices
- Historical data going back several years
- Support for thousands of stock symbols

## 🤝 Contributing

Feel free to fork this project and submit pull requests with improvements!

## 📄 License

This project is open source and available under the MIT License.