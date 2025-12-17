import json

def get_stock_price(ticker):
    """
    Obtiene el precio actual de una acción en la bolsa de valores.
    """
    simulated_prices = {
        "GOOG": {"price": 175.50, "currency": "USD", "status": "Success"},
        "AAPL": {"price": 200.15, "currency": "USD", "status": "Success"},
        "TSLA": {"price": 25.90, "currency": "USD", "status": "Success"},
    }
    
    price_info = simulated_prices.get(ticker.upper(), 
        {"price": "N/A", "currency": "N/A", "status": "Error: Ticker no encontrado"})
        
    return json.dumps({
        "function_name": "get_stock_price",
        "ticker": ticker,
        "result": price_info,
        "timestamp": "2024-10-05"
    })

AVAILABLE_FUNCTIONS = {
    "get_stock_price": get_stock_price,
}