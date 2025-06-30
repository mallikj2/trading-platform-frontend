# Trading Platform Frontend

This is the frontend application for the Real-time Algorithmic Trading Platform. It is built with React and will connect to the Spring Boot backend via WebSockets to display real-time stock data, technical indicators, and trading signals.

## Getting Started

### Prerequisites

*   Node.js and npm (or yarn) installed.
*   The Spring Boot backend application should be running.

### Installation

Navigate to this `trading-platform-frontend` directory in your terminal and install the dependencies:

```bash
npm install
# or
yarn install
```

### Running the Application

To start the development server, run:

```bash
npm start
# or
yarn start
```

This will open the application in your browser at `http://localhost:3000`.

## Connecting to the Backend WebSocket

The Spring Boot backend exposes a WebSocket endpoint at `ws://localhost:8080/ws`. You can use a WebSocket client library (like `sockjs-client` and `stompjs`) in your React components to establish a connection and subscribe to topics.

### Example WebSocket Connection (Conceptual)

```javascript
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

// ... inside a React component

useEffect(() => {
  const socket = new SockJS('http://localhost:8080/ws');
  const stompClient = Stomp.over(socket);

  stompClient.connect({}, frame => {
    console.log('Connected: ' + frame);
    stompClient.subscribe('/topic/stock-data/AAPL', message => {
      console.log('Received stock data: ' + message.body);
      // Update your chart/UI with the received data
    });
  });

  return () => {
    if (stompClient.connected) {
      stompClient.disconnect();
    }
  };
}, []);
```

## Data Visualization

You can integrate a charting library like Lightweight Charts or Chart.js to display the stock data and indicators. The data received via WebSocket can be used to update these charts in real-time.

## Next Steps for UI Development

1.  **Implement WebSocket Client:** Set up the WebSocket connection and subscribe to relevant topics (e.g., `/topic/stock-data/{symbol}`).
2.  **Chart Integration:** Integrate a charting library and feed it the real-time stock data.
3.  **Indicator Overlays:** Add logic to display SMA, RSI, and MACD indicators on the charts.
4.  **Signal Display:** Visualize buy/sell signals on the charts or in a separate log.
5.  **User Input:** Create input fields for selecting symbols and triggering data fetches from the backend.
6.  **Styling and Layout:** Design an intuitive and visually appealing user interface.