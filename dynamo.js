const AWS = require("aws-sdk");
require("dotenv").config();
const math = require("mathjs");

AWS.config.update({
  // region: process.env.AWS_DEFAULT_REGION_1,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const dynamoClient_1 = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_DEFAULT_REGION_1,
});
const dynamoClient_2 = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_DEFAULT_REGION_2,
});

const USER_TABLE_NAME = "users";
const STOCKS_TABLE_NAME = "stocksData";

const getUserFromReplica = async (email) => {
  const params = {
    TableName: USER_TABLE_NAME,
    Key: {
      email: email,
    },
  };
  return await dynamoClient_2.get(params).promise();
};

const getUser = async (email) => {
  const params = {
    TableName: USER_TABLE_NAME,
    Key: {
      email: email,
    },
  };
  return await dynamoClient_1.get(params).promise();
};

const getStockDataById = async (id) => {
  // const params = {
  //   TableName: STOCKS_TABLE_NAME,
  //   Select: "COUNT",
  // };
  // return await dynamoClient_1.scan(params).promise();
  const params = {
    TableName: STOCKS_TABLE_NAME,
    Key: {
      id: parseInt(id),
    },
  };
  return await dynamoClient_1.get(params).promise();
};

const getHighAndLow = async (company) => {
  const params = {
    TableName: STOCKS_TABLE_NAME,
    FilterExpression: "#symbol = :symbol",
    ExpressionAttributeNames: {
      "#symbol": "symbol",
    },
    ExpressionAttributeValues: {
      ":symbol": company,
    },
  };
  return await dynamoClient_1.scan(params).promise();
};

const addUser = async (user) => {
  const params = {
    TableName: USER_TABLE_NAME,
    Item: user,
  };
  return await dynamoClient_1.put(params).promise();
};

const addUserFromReplica = async (user) => {
  const params = {
    TableName: USER_TABLE_NAME,
    Item: user,
  };
  return await dynamoClient_2.put(params).promise();
};

function calculateReturns(closingPrices) {
  const returns = [];

  for (let i = 1; i < closingPrices.length; i++) {
    const currentPrice = parseFloat(closingPrices[i]);
    const previousPrice = parseFloat(closingPrices[i - 1]);

    // Check if prices are valid numbers
    if (!isNaN(currentPrice) && !isNaN(previousPrice)) {
      // Calculate daily return: (currentPrice - previousPrice) / previousPrice
      const dailyReturn = (currentPrice - previousPrice) / previousPrice;
      returns.push(dailyReturn);
    }
  }

  return returns;
}

function identifySupportResistanceLevels(items) {
  const supportLevels = [];
  const resistanceLevels = [];

  for (let i = 0; i < items.length; i++) {
    const currentHigh = items[i].high;
    const currentLow = items[i].low;

    // Check for potential support level
    if (i > 0 && currentLow < items[i - 1].low) {
      supportLevels.push(currentLow);
    }

    // Check for potential resistance level
    if (i > 0 && currentHigh > items[i - 1].high) {
      resistanceLevels.push(currentHigh);
    }
  }

  return {
    supportLevels,
    resistanceLevels,
  };
}

function calculateEMA(data, period) {
  const ema = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      // If there are not enough previous data points, calculate SMA
      const sma =
        data.slice(0, i + 1).reduce((sum, value) => sum + value, 0) / (i + 1);
      ema.push(sma);
    } else {
      // Calculate EMA using the multiplier
      const multiplier = 2 / (period + 1);
      const currentEMA = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
      ema.push(currentEMA);
    }
  }

  return ema;
}

function generateTradingSignals(items) {
  const signals = [];

  // Assuming 'close' prices are available in your data
  const closePrices = items.map((item) => parseFloat(item.close)); // Convert to number

  console.log("Close Prices:", closePrices);

  // Use exponential moving averages (EMA) for demonstration
  const shortTermEMA = calculateEMA(closePrices, 10); // Adjust the period as needed
  const longTermEMA = calculateEMA(closePrices, 20); // Adjust the period as needed

  console.log("Short-Term EMA:", shortTermEMA);
  console.log("Long-Term EMA:", longTermEMA);

  for (let i = 1; i < closePrices.length; i++) {
    const shortTermValue = shortTermEMA[i];
    const longTermValue = longTermEMA[i];
    const previousShortTermValue = shortTermEMA[i - 1];
    const previousLongTermValue = longTermEMA[i - 1];

    // Buy Signal: Short-term EMA crosses above long-term EMA
    if (
      shortTermValue > longTermValue &&
      previousShortTermValue <= previousLongTermValue
    ) {
      signals.push({ timestamp: items[i].timestamp, signal: "BUY" });
    }

    // Sell Signal: Short-term EMA crosses below long-term EMA
    if (
      shortTermValue < longTermValue &&
      previousShortTermValue >= previousLongTermValue
    ) {
      signals.push({ timestamp: items[i].timestamp, signal: "SELL" });
    }
  }

  return signals;
}

function calculateAverageReturn(returns) {
  if (returns.length === 0) {
    return 0;
  }

  const sumReturns = returns.reduce((sum, value) => sum + value, 0);
  return sumReturns / returns.length;
}

function calculateStandardDeviation(returns) {
  if (returns.length === 0) {
    return 0;
  }

  const meanReturn = calculateAverageReturn(returns);

  const squaredDifferences = returns.map((returnVal) =>
    Math.pow(returnVal - meanReturn, 2)
  );
  const variance =
    squaredDifferences.reduce((sum, value) => sum + value, 0) / returns.length;

  return Math.sqrt(variance);
}

function calculateSharpeRatio(averageReturn, standardDeviation, riskFreeRate) {
  if (standardDeviation === 0) {
    return 0;
  }

  return (averageReturn - riskFreeRate) / standardDeviation;
}
function calculateCorrelationCoefficient(data1, data2) {
  // Ensure both datasets have the same length
  const commonLength = Math.min(data1.length, data2.length);

  // Slice the datasets to have a common length
  const slicedData1 = data1.slice(0, commonLength);
  const slicedData2 = data2.slice(0, commonLength);

  // Calculate the mean of each dataset
  const mean1 = math.mean(slicedData1);
  const mean2 = math.mean(slicedData2);

  // Calculate the differences from the mean for each dataset
  const diff1 = slicedData1.map((x) => x - mean1);
  const diff2 = slicedData2.map((y) => y - mean2);

  // Calculate the numerator and denominator for the correlation coefficient formula
  const numerator = math.dot(diff1, diff2);
  const denominator = math.sqrt(
    math.dot(diff1, diff1) * math.dot(diff2, diff2)
  );

  // Calculate the correlation coefficient
  const correlationCoefficient = numerator / denominator;

  return correlationCoefficient;
}

function analyzeCorrelation(targetStockData, comparisonDataList) {
  const correlationResults = {};

  comparisonDataList.forEach(({ symbol, data }) => {
    const targetClosePrices = targetStockData.map((item) =>
      parseFloat(item.close)
    );
    const comparisonClosePrices = data.map((item) => parseFloat(item.close));

    const correlationCoefficient = calculateCorrelationCoefficient(
      targetClosePrices,
      comparisonClosePrices
    );

    correlationResults[symbol] = correlationCoefficient;
  });

  return correlationResults;
}

// const deleteUser = async (id) => {
//   const params = {
//     TableName: USER_TABLE_NAME,
//     Key: {
//       id,
//     },
//   };
//   return await dynamoClient_1.delete(params).promise();
// };

module.exports = {
  dynamoClient_1,
  getUser,
  getStockDataById,
  addUser,
  getUserFromReplica,
  addUserFromReplica,
  getHighAndLow,
  calculateReturns,
  identifySupportResistanceLevels,
  generateTradingSignals,
  calculateStandardDeviation,
  calculateSharpeRatio,
  analyzeCorrelation,
  calculateAverageReturn,
};
