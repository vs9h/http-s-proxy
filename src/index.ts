import "dotenv/config";
import { info } from "./logger";
import { proxyServer } from "./proxy";
import { traceTCPPackets } from "./tcpPacketSniffer";

proxyServer.listen(process.env.SERVER_PORT, () =>
    info(`Proxy server running at http://${process.env.HOST_NAME}:${process.env.SERVER_PORT}"`)
);

if (process.env.TRACE_TCP_PACKETS === "true") {
    traceTCPPackets();
}
