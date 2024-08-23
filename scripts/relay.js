const { handler } = require("../action");

// Run autotask code locally using the Relayer API key and secret
if (require.main === module) {
  require("dotenv").config();
  const { RELAYER_API_KEY: apiKey, RELAYER_API_SECRET: apiSecret } =
    process.env;
  const payload = require("fs").readFileSync("tmp/request.json");
  // console.log("Processing request...", apiKey, apiSecret);
  handler({
    // apiKey, apiSecret,
    relayerApiKey: process.env.RELAYER_API_KEY,
    relayerApiSecret: process.env.RELAYER_API_SECRET,
    request: { body: JSON.parse(payload) },
  })
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
