const Axios = require("axios");
const nconf = require("nconf");

module.exports.getHostnameForWebhookRegistration = async function () {
  let hostname;
  try {
    let urlFromNGROK;
    const ngrokTunnels = (
      await Axios.default.get(`http://kloudi-ngrok-tunnel:4040/api/tunnels`)
    ).data;
    if (
      ngrokTunnels &&
      ngrokTunnels["tunnels"] &&
      ngrokTunnels["tunnels"].length > 0
    ) {
      for (const tunnel of ngrokTunnels["tunnels"]) {
        if (
          tunnel &&
          tunnel["public_url"] &&
          tunnel["config"]["addr"] === "http://kloudi-pepper:4017" &&
          tunnel["public_url"].includes("https")
        ) {
          urlFromNGROK = tunnel["public_url"];
          break;
        }
      }
    }
    if (urlFromNGROK) hostname = urlFromNGROK;
  } catch (error) {
  } finally {
    if (!hostname) hostname = nconf.get("WEBHOOK_API_URI");
    return `${hostname}/webhooks`;
  }
};
