import "dotenv/config";
import os from "os";

const CONSUL_HTTP_ADDR = process.env.CONSUL_HTTP_ADDR || "http://consul:8500";
const SERVICE_NAME = process.env.SERVICE_NAME || "leave-service";
const SERVICE_ID = `${SERVICE_NAME}-${os.hostname()}-${process.pid}-${Date.now()}`;
const PORT = Number(process.env.PORT || 3001);

const getContainerIp = () => {
  const nets = os.networkInterfaces();

  for (const ifaceName of Object.keys(nets)) {
    for (const net of nets[ifaceName] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }

  return "127.0.0.1";
}

const consulRequest = async (path, options = {}) => {
  const res = await fetch(`${CONSUL_HTTP_ADDR}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Consul request failed: ${res.status} ${res.statusText} ${text}`
    );
  }

  return res;
}

export const registerServiceWithConsul = async () => {
  const address = process.env.SERVICE_ADDRESS || getContainerIp();
  const healthUrl = `http://${address}:${PORT}/leave/health`;

  const payload = {
    ID: SERVICE_ID,
    Name: SERVICE_NAME,
    Address: address,
    Port: PORT,
    Tags: ["nodejs", "leave", "lms"],
    Check: {
      HTTP: healthUrl,
      Interval: "10s",
      Timeout: "2s"
    }
  };

  await consulRequest("/v1/agent/service/register", {
    method: "PUT",
    body: JSON.stringify(payload)
  });

  console.log(
    `[${SERVICE_NAME}] Registered with Consul at ${address}:${PORT}`
  );
}

export const deregisterServiceFromConsul = async () => {
  await consulRequest(`/v1/agent/service/deregister/${encodeURIComponent(SERVICE_ID)}`, {
    method: "PUT"
  });

  console.log(`[${SERVICE_NAME}] Deregistered from Consul`);
}