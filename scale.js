const loop = async () => {
  while (true) {
    await fetchStockData();
  }
};

const fetchStockData = async () => {
  try {
    const response = await fetch(
      "http://y-load-balancer-868859267.us-east-1.elb.amazonaws.com/stock-data/100"
    );
    const data = await response.json();
    console.log("called");
  } catch (error) {
    console.error(error);
  }
};

loop();
