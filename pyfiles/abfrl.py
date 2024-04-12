import sys
import pickle
import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dropout, Dense
from sklearn.preprocessing import StandardScaler


def data_prep(df, lookback, future, Scale):
    date_train = pd.to_datetime(df['timestamp'])
    df_train = df[['open', 'high', 'low', 'close', 'volume']]
    df_train = df_train.astype(float)

    df_train_scaled = Scale.fit_transform(df_train)

    X, y = [], []
    for i in range(lookback, len(df_train_scaled)-future+1):
        X.append(df_train_scaled[i-lookback:i, 0:df_train.shape[1]])
        y.append(df_train_scaled[i+future-1:i+future, 0])

    return np.array(X), np.array(y), df_train, date_train

# Function to load the model


def load_model(model_path):
    with open(model_path, 'rb') as f:
        loaded_model = pickle.load(f)
    return loaded_model

# Function to make predictions


def predict_open(model, date_train, Lstm_x, df_train, future, Scale):
    forecasting_dates = pd.date_range(
        list(date_train)[-1], periods=future, freq='1d').tolist()
    predicted = model.predict(Lstm_x[-future:])
    predicted1 = np.repeat(predicted, df_train.shape[1], axis=-1)
    predicted_descaled = Scale.inverse_transform(predicted1)[:, 0]
    return predicted_descaled, forecasting_dates

# Function to prepare output


def output_prep(forecasting_dates, predicted_descaled):
    dates = []
    for i in forecasting_dates:
        dates.append(i.date())
    df_final = pd.DataFrame(columns=['timestamp', 'open'])
    df_final['timestamp'] = pd.to_datetime(dates)
    df_final['open'] = predicted_descaled
    return df_final


# Retrieve input parameters
lookback = 30  # int(sys.argv[1])
future = 1  # int(sys.argv[2])

# Load the scaler
Scale = StandardScaler()

# Assuming 'aarti.pkl' is your pickle file path
model_path = 'models/abfrl.pkl'

df_adaniport = pd.read_csv("csvs/ABFRL__EQ__NSE__NSE__MINUTE.csv")

# Load the model
loaded_model = load_model(model_path)

# Assuming df_abc is your new data for prediction
# Perform data preparation
Lstm_x, Lstm_y, df_train, date_train = data_prep(
    df_adaniport, lookback, future, Scale)

# Make predictions
predicted_descaled, forecasting_dates = predict_open(
    loaded_model, date_train, Lstm_x, df_train, future, Scale)

# Prepare the results DataFrame
results = output_prep(forecasting_dates, predicted_descaled)

# Print the results or save them as needed
print(results)
