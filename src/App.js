import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { createChart, ColorType } from 'lightweight-charts'; // Import charting library

const API_BASE_URL = 'http://localhost:8080/api/v1/stock';
const WEBSOCKET_URL = 'http://localhost:8080/ws';

function App() {
  const [symbol, setSymbol] = useState('IBM'); // Default symbol
  const [stockData, setStockData] = useState([]);
  const [signals, setSignals] = useState([]);
  const [backtestResults, setBacktestResults] = useState([]);
  const [simulatedTrades, setSimulatedTrades] = useState([]);

  const chartContainerRef = useRef();
  const chartRef = useRef();
  const candlestickSeriesRef = useRef();
  const smaSeriesRef = useRef();
  const rsiSeriesRef = useRef();
  const macdSeriesRef = useRef();

  const stompClientRef = useRef(null);

  // --- WebSocket Connection and Data Subscription ---
  useEffect(() => {
    const socket = new SockJS(WEBSOCKET_URL);
    const stompClient = Stomp.over(socket);
    stompClientRef.current = stompClient;

    stompClient.connect({}, frame => {
      console.log('Connected to WebSocket: ' + frame);

      // Subscribe to stock data updates
      stompClient.subscribe(`/topic/stock-data/${symbol}`, message => {
        const newStockData = JSON.parse(message.body);
        console.log('Received stock data:', newStockData);
        // Update chart with new candlestick data
        if (candlestickSeriesRef.current) {
          candlestickSeriesRef.current.update({
            time: new Date(newStockData.timestamp).getTime() / 1000, // Lightweight Charts expects Unix timestamp in seconds
            open: newStockData.open,
            high: newStockData.high,
            low: newStockData.low,
            close: newStockData.close,
          });
        }
        // You would also update SMA, RSI, MACD series here if they were pushed separately
        // For now, we'll assume indicators are calculated on the backend and pushed as part of stock-data or a separate topic
      });

      // Subscribe to trading signals
      stompClient.subscribe(`/topic/trading-signals/${symbol}`, message => {
        const newSignal = JSON.parse(message.body);
        console.log('Received signal:', newSignal);
        setSignals(prevSignals => [...prevSignals, newSignal]);

        // Add signal marker to chart (conceptual)
        if (candlestickSeriesRef.current) {
          const color = newSignal.signalType === 'BUY' ? 'green' : 'red';
          const shape = newSignal.signalType === 'BUY' ? 'arrowUp' : 'arrowDown';
          candlestickSeriesRef.current.createMarker({
            time: new Date(newSignal.timestamp).getTime() / 1000,
            position: newSignal.signalType === 'BUY' ? 'belowBar' : 'aboveBar',
            color: color,
            shape: shape,
            text: newSignal.signalType,
          });
        }
      });

      // Initial fetch of historical data and indicators
      fetchHistoricalData(symbol);
      fetchBacktestResults();
      fetchSimulatedTrades();

    }, error => {
      console.error('WebSocket connection error:', error);
    });

    return () => {
      if (stompClientRef.current && stompClientRef.current.connected) {
        stompClientRef.current.disconnect();
        console.log('Disconnected from WebSocket');
      }
    };
  }, [symbol]); // Reconnect WebSocket if symbol changes

  // --- Chart Initialization ---
  useEffect(() => {
    if (chartContainerRef.current) {
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 400,
        layout: {
          backgroundColor: '#ffffff',
          textColor: '#333',
        },
        grid: {
          vertLines: {
            color: 'rgba(197, 203, 206, 0.5)',
          },
          horzLines: {
            color: 'rgba(197, 203, 206, 0.5)',
          },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: true,
        },
      });
      chartRef.current = chart;

      candlestickSeriesRef.current = chart.addCandlestickSeries({
        upColor: 'rgba(39, 157, 130, 1)',
        downColor: 'rgba(214, 56, 80, 1)',
        borderDownColor: 'rgba(214, 56, 80, 1)',
        borderUpColor: 'rgba(39, 157, 130, 1)',
        wickDownColor: 'rgba(214, 56, 80, 1)',
        wickUpColor: 'rgba(39, 157, 130, 1)',
      });

      // Add SMA series (conceptual)
      smaSeriesRef.current = chart.addLineSeries({ color: 'blue', lineWidth: 1 });
      // Add RSI series (conceptual) - typically on a separate pane
      // rsiSeriesRef.current = chart.addLineSeries({ color: 'purple', lineWidth: 1 });
      // Add MACD series (conceptual) - typically on a separate pane
      // macdSeriesRef.current = chart.addLineSeries({ color: 'orange', lineWidth: 1 });

      const handleResize = () => {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    }
  }, []);

  // --- Fetch Historical Data and Initial Chart Load ---
  const fetchHistoricalData = async (currentSymbol) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/${currentSymbol}`);
      const data = response.data.map(d => ({
        time: new Date(d.timestamp).getTime() / 1000,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));
      setStockData(data);
      if (candlestickSeriesRef.current) {
        candlestickSeriesRef.current.setData(data);
        // You would also fetch and set initial indicator data here
        // For example: fetchSMA(currentSymbol, 20);
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  };

  // --- Fetch Backtest Results ---
  const fetchBacktestResults = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/backtest/results`);
      setBacktestResults(response.data);
    } catch (error) {
      console.error('Error fetching backtest results:', error);
    }
  };

  // --- Fetch Simulated Trades ---
  const fetchSimulatedTrades = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/simulated-trades`);
      setSimulatedTrades(response.data);
    } catch (error) {
      console.error('Error fetching simulated trades:', error);
    }
  };

  // --- Event Handlers ---
  const handleSymbolChange = (event) => {
    setSymbol(event.target.value.toUpperCase());
  };

  const handleFetchData = () => {
    // Trigger backend data ingestion
    axios.get(`${API_BASE_URL}/${symbol}/fetch`)
      .then(response => console.log(response.data))
      .catch(error => console.error('Error triggering data fetch:', error));
  };

  const handleRunBacktest = () => {
    // Example: Run SMA Crossover backtest for a specific period
    const startDate = '2024-01-01'; // Adjust as needed
    const endDate = '2024-01-05';   // Adjust as needed
    axios.get(`${API_BASE_URL}/${symbol}/backtest/sma-crossover?startDate=${startDate}&endDate=${endDate}`)
      .then(response => {
        console.log('Backtest initiated:', response.data);
        fetchBacktestResults(); // Refresh backtest results
      })
      .catch(error => console.error('Error running backtest:', error));
  };


  return (
    <div style={{ padding: '20px' }}>
      <h1>Real-time Algorithmic Trading Platform</h1>

      {/* Symbol Input and Controls */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={symbol}
          onChange={handleSymbolChange}
          placeholder="Enter Stock Symbol (e.g., IBM)"
          style={{ marginRight: '10px', padding: '8px' }}
        />
        <button onClick={handleFetchData} style={{ padding: '8px 15px', marginRight: '10px' }}>
          Fetch Live Data
        </button>
        <button onClick={handleRunBacktest} style={{ padding: '8px 15px' }}>
          Run Backtest
        </button>
      </div>

      {/* Live Chart */}
      <h2>Live Chart: {symbol}</h2>
      <div ref={chartContainerRef} style={{ height: '400px', marginBottom: '20px' }}></div>

      {/* Signals Log */}
      <h2>Signals</h2>
      <div style={{ maxHeight: '200px', overflowY: 'scroll', border: '1px solid #ccc', padding: '10px', marginBottom: '20px' }}>
        {signals.length === 0 ? (
          <p>No signals yet.</p>
        ) : (
          <ul>
            {signals.map((signal, index) => (
              <li key={index}>
                [{new Date(signal.timestamp).toLocaleString()}] {signal.symbol} - {signal.signalType} ({signal.strategyName}): {signal.description}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Backtest Results */}
      <h2>Backtest Results</h2>
      <div style={{ maxHeight: '200px', overflowY: 'scroll', border: '1px solid #ccc', padding: '10px', marginBottom: '20px' }}>
        {backtestResults.length === 0 ? (
          <p>No backtest results yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Strategy</th>
                <th>Symbol</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Initial Capital</th>
                <th>Final Capital</th>
                <th>P/L ($)</th>
                <th>P/L (%)</th>
                <th>Trades</th>
                <th>Wins</th>
                <th>Losses</th>
              </tr>
            </thead>
            <tbody>
              {backtestResults.map(result => (
                <tr key={result.id}>
                  <td>{result.strategyName}</td>
                  <td>{result.symbol}</td>
                  <td>{result.startDate}</td>
                  <td>{result.endDate}</td>
                  <td>{result.initialCapital.toFixed(2)}</td>
                  <td>{result.finalCapital.toFixed(2)}</td>
                  <td>{result.totalProfitLoss.toFixed(2)}</td>
                  <td>{result.percentageProfitLoss.toFixed(2)}</td>
                  <td>{result.totalTrades}</td>
                  <td>{result.winningTrades}</td>
                  <td>{result.losingTrades}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Simulated Trades */}
      <h2>Simulated Trades</h2>
      <div style={{ maxHeight: '200px', overflowY: 'scroll', border: '1px solid #ccc', padding: '10px' }}>
        {simulatedTrades.length === 0 ? (
          <p>No simulated trades yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Timestamp</th>
                <th>Type</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Strategy</th>
                <th>Cash After</th>
                {/* <th>Portfolio Value After</th> */}
              </tr>
            </thead>
            <tbody>
              {simulatedTrades.map(trade => (
                <tr key={trade.id}>
                  <td>{trade.symbol}</td>
                  <td>{new Date(trade.timestamp).toLocaleString()}</td>
                  <td>{trade.tradeType}</td>
                  <td>{trade.price.toFixed(2)}</td>
                  <td>{trade.quantity.toFixed(2)}</td>
                  <td>{trade.strategyName}</td>
                  <td>{trade.cashAfterTrade.toFixed(2)}</td>
                  {/* <td>{trade.portfolioValueAfterTrade.toFixed(2)}</td> */}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default App;