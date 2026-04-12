

## Plan: MT5 Python WebSocket Bridge — Complete Application

### কি করা হবে
9টি file generate করে `/mnt/documents/mt5_bridge/` এ রাখা হবে — তুমি download করে Windows VPS/PC তে চালাবে।

### Files

| File | Purpose |
|------|---------|
| `main.py` | Entry point — MT5 init + WS server + FastAPI start |
| `config.py` | Settings loader (.env থেকে) |
| `mt5_connector.py` | MT5 library wrapper — ticks, candles, status |
| `ws_server.py` | WebSocket broadcast server (port 8765) |
| `candle_endpoint.py` | FastAPI REST endpoints (port 8000) |
| `.env.example` | Template config |
| `requirements.txt` | Dependencies |
| `README.md` | Full setup guide with n8n instructions |
| `test_client.html` | Dark-themed live price dashboard |

### Technical Details

- **main.py**: `asyncio.gather()` দিয়ে WS server + tick streaming loop + FastAPI (uvicorn) তিনটা concurrent চলবে
- **mt5_connector.py**: Auto-reconnect logic — MT5 disconnect হলে 5 sec পর retry, max 10 attempts
- **ws_server.py**: `set()` of connected clients, broadcast to all, graceful disconnect handling
- **candle_endpoint.py**: FastAPI with `/candles`, `/tick`, `/symbols`, `/status` endpoints
- **test_client.html**: Pure HTML/CSS/JS, dark theme, monospace, green/red connection indicator, live table

### Output
সব file `/mnt/documents/mt5_bridge/` folder এ generate হবে — zip না করে individual files হিসেবে, যেন তুমি সরাসরি VPS এ copy করতে পারো।

