import yfinance as yf
import pandas as pd
import numpy as np
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
import joblib
import time
import os

def calculate_rsi(data, window=14):
    delta = data.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def get_yf_ticker(symbol):
    exchange = symbol.split(':')[0] if ':' in symbol else ""
    pair = symbol.split(':')[-1] if ':' in symbol else symbol
    if 'XAU' in pair or 'GOLD' in pair: return 'GC=F'
    if 'BTC' in pair: return 'BTC-USD'
    if 'ETH' in pair: return 'ETH-USD'
    if pair.endswith('USDT'): return f"{pair.replace('USDT', '')}-USD"
    if exchange in ['OANDA', 'FOREXCOM', 'FX_IDC', 'VANTAGE'] and len(pair) == 6: return f"{pair}=X"
    return pair

def get_historical_data(symbol, interval="15m", period="60d"):
    print(f"Downloading deep historical data for {symbol}...")
    yf_ticker = get_yf_ticker(symbol)
    ticker = yf.Ticker(yf_ticker)
    df = ticker.history(period=period, interval=interval.lower())
    if df.empty: return pd.DataFrame()
    df.rename(columns={'Open':'open', 'High':'high', 'Low':'low', 'Close':'close', 'Volume':'volume'}, inplace=True)
    full_df = df[['open', 'high', 'low', 'close', 'volume']].copy()
    full_df['volume'] = full_df['volume'].replace(0, 1)
    return full_df

def engineer_universal_features(df):
    # Base indicators
    df['returns'] = df['close'].pct_change()
    sma_20 = df['close'].rolling(20).mean()
    sma_50 = df['close'].rolling(50).mean()
    std_20 = df['close'].rolling(20).std()
    
    # Universal Scaleless Features (Works on BTC at 60k AND Gold at 2k without breaking scaler)
    df['dist_sma20'] = (df['close'] - sma_20) / sma_20
    df['dist_sma50'] = (df['close'] - sma_50) / sma_50
    df['volatility_pct'] = std_20 / df['close']
    df['rsi_14'] = calculate_rsi(df['close'], 14) / 100.0 # Scale 0 to 1
    df['volume_change'] = df['volume'].pct_change()
    
    # NEW: Bollinger Bands %B
    bb_upper = sma_20 + (std_20 * 2)
    bb_lower = sma_20 - (std_20 * 2)
    bb_range = bb_upper - bb_lower
    bb_range = bb_range.replace(0, 1e-5) # Avoid division by zero
    df['bb_pct'] = (df['close'] - bb_lower) / bb_range
    
    # NEW: MACD Normalized
    ema12 = df['close'].ewm(span=12, adjust=False).mean()
    ema26 = df['close'].ewm(span=26, adjust=False).mean()
    macd = ema12 - ema26
    macd_signal = macd.ewm(span=9, adjust=False).mean()
    df['macd_hist_pct'] = (macd - macd_signal) / df['close']
    
    # Target (1 if next candle is UP)
    df['target'] = (df['close'].shift(-1) > df['close']).astype(int)
    
    df = df.dropna()
    features = ['returns', 'dist_sma20', 'dist_sma50', 'volatility_pct', 'rsi_14', 'volume_change', 'bb_pct', 'macd_hist_pct']
    # Clip extreme outliers
    df[features] = df[features].clip(lower=-5, upper=5)
    
    return df, features

def train_universal_model():
    print("Gathering data from Multiple Markets to build a Universal AI...")
    # Train on Gold, Bitcoin, and Apple all at once!
    symbols = ["VANTAGE:XAUUSD", "BINANCE:BTCUSDT", "NASDAQ:AAPL"]
    
    all_X_data = []
    all_y_data = []
    features_list = None
    
    for sym in symbols:
        df = get_historical_data(sym)
        if df.empty: continue
        df, features_list = engineer_universal_features(df)
        all_X_data.append(df[features_list].values)
        all_y_data.append(df['target'].values)
        
    X_data = np.vstack(all_X_data)
    y_data = np.concatenate(all_y_data)
    
    print("Scaling Data globally using StandardScaler...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_data)
    
    lookback = 10 
    X, y = [], []
    for i in range(lookback, len(X_scaled) - 1):
        X.append(X_scaled[i-lookback:i].flatten())
        y.append(y_data[i])
        
    X = np.array(X)
    y = np.array(y)
    
    print(f"Training Advanced Universal MLP Neural Network on {len(X)} combined sequences...")
    model = MLPClassifier(hidden_layer_sizes=(150, 100, 50), activation='relu', solver='adam', max_iter=300, random_state=42, verbose=True)
    model.fit(X, y)
    
    print("Saving AI Universal Brain to disk...")
    joblib.dump(model, 'nexus_brain.save')
    joblib.dump(scaler, 'nexus_scaler.save')
    print("Universal Model successfully saved!")

if __name__ == "__main__":
    train_universal_model()
