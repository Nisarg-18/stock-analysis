const express = require("express");
const AWS = require("aws-sdk");
const app = express();
const math = require("mathjs");
const { PythonShell } = require("python-shell");

const {
  addUser,
  getUser,
  getStockDataById,
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
} = require("./dynamo");

app.use(express.json());

AWS.config.update({
  // region: process.env.AWS_DEFAULT_REGION_1,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const dynamoClient_1 = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_DEFAULT_REGION_1,
});

app.get("/", (req, res) => {
  res.send("Home");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/users-replica/:email", async (req, res) => {
  const email = req.params.email;
  try {
    const user = await getUserFromReplica(email);
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ err: "Something went wrong" });
  }
});

app.get("/users/:email", async (req, res) => {
  const email = req.params.email;
  try {
    const user = await getUser(email);
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ err: "Something went wrong" });
  }
});

app.get("/stock-data/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const data = await getStockDataById(id);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ err: "Something went wrong" });
  }
});

app.post("/add-user", async (req, res) => {
  const user = req.body;
  try {
    const newUser = await addUser(user);
    res.json(newUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ err: "Something went wrong" });
  }
});

app.post("/add-user-replica", async (req, res) => {
  const user = req.body;
  try {
    const newUser = await addUserFromReplica(user);
    res.json(newUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ err: "Something went wrong" });
  }
});

app.post("/company-data", async (req, res) => {
  const { companyName } = req.body;
  try {
    const result = await getHighAndLow(companyName);
    const items = result.Items;

    const closingPrices = items.map((item) => ({
      timestamp: item.timestamp,
      close: item.close,
    }));

    const allTimeHigh = Math.max(...closingPrices.map((item) => item.close));
    const allTimeLow = Math.min(...closingPrices.map((item) => item.close));

    res.json({
      allTimeHigh,
      allTimeLow,
    });
  } catch (error) {
    console.error("Error querying DynamoDB:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/volatility-analysis", async (req, res) => {
  const { companyName } = req.body;

  try {
    const result = await getHighAndLow(companyName);
    const closingPrices = result.Items.map((item) => item.close);
    console.log("Closing Prices:", closingPrices);

    // Calculate daily returns
    const returns = calculateReturns(closingPrices);

    // Calculate volatility (standard deviation of returns)
    const volatility = math.std(returns);

    res.json({
      volatility,
    });
  } catch (error) {
    console.error("Error querying DynamoDB:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/support-resistance-levels", async (req, res) => {
  const { companyName } = req.body;

  try {
    const result = await getHighAndLow(companyName);
    const items = result.Items;

    const supportResistanceLevels = identifySupportResistanceLevels(items);

    res.json({
      supportResistanceLevels,
    });
  } catch (error) {
    console.error("Error querying DynamoDB:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/trading-signals", async (req, res) => {
  const { companyName } = req.body;

  try {
    const result = await getHighAndLow(companyName);
    const items = result.Items;

    console.log("Historical Prices:", items);

    const tradingSignals = generateTradingSignals(items);

    res.json({
      tradingSignals,
    });
  } catch (error) {
    console.error("Error querying DynamoDB:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/company-performance-metrics", async (req, res) => {
  const { companyName } = req.body;

  try {
    const result = await getHighAndLow(companyName);
    const items = result.Items;

    const closingPrices = items.map((item) => parseFloat(item.close)); // Convert to number

    // Calculate daily returns
    const returns = calculateReturns(closingPrices);

    // Calculate average return
    const averageReturn = calculateAverageReturn(returns);

    // Calculate standard deviation
    const standardDeviation = calculateStandardDeviation(returns);

    // Assuming risk-free rate is 0 for simplicity
    const riskFreeRate = 0;

    // Calculate Sharpe ratio
    const sharpeRatio = calculateSharpeRatio(
      averageReturn,
      standardDeviation,
      riskFreeRate
    );

    res.json({
      averageReturn,
      standardDeviation,
      sharpeRatio,
    });
  } catch (error) {
    console.error("Error querying DynamoDB:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/correlation-analysis", async (req, res) => {
  const { companyName, comparisonSymbols } = req.body;

  try {
    // Fetch historical data from DynamoDB for the target stock
    const result = await getHighAndLow(companyName);
    const targetStockData = result.Items;

    // Fetch historical data for comparison symbols
    const comparisonDataPromises = comparisonSymbols.map(async (symbol) => {
      const comparisonResult = await getHighAndLow(symbol);
      return { symbol, data: comparisonResult.Items };
    });

    const comparisonDataList = await Promise.all(comparisonDataPromises);

    // Perform correlation analysis
    const correlationResults = analyzeCorrelation(
      targetStockData,
      comparisonDataList
    );

    res.json({
      correlationResults,
    });
  } catch (error) {
    console.error("Error querying DynamoDB:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/get-prediction", async (req, res) => {
  const { companyName } = req.body;

  try {
    var pythonScriptPath;
    if (companyName == "ADANIPORTS") {
      pythonScriptPath = "pyfiles/adaniports.py";
    } else if (companyName == "ADANIENT") {
      pythonScriptPath = "pyfiles/adanien.py";
    } else if (companyName == "AARTIIND") {
      pythonScriptPath = "pyfiles/aarti.py";
    } else if (companyName == "ABFRL") {
      pythonScriptPath = "pyfiles/abfrl.py";
    } else if (companyName == "ABCAPITAL") {
      pythonScriptPath = "pyfiles/abc.py";
    }

    // Set your input parameters
    const lookback = 30;
    const future = 1;

    // Create a new PythonShell instance with input parameters
    let pyshell = new PythonShell(pythonScriptPath, {
      args: [lookback.toString(), future.toString()],
    });

    let prediction = ""; // Variable to store the result

    // Register the message event to receive output from the Python script
    pyshell.on("message", (message) => {
      console.log(message);
      prediction = message; // Store the result
    });

    // End the PythonShell instance
    pyshell.end((err, code, signal) => {
      if (err) throw err;
      console.log("Python script finished with code " + code);

      // Send the result back to the client
      res.json({
        prediction,
      });
    });
  } catch (error) {
    console.error("Error getting prediction:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`listening on port port`);
});
