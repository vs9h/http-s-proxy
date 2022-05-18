import "dotenv/config";
import { debug, error, errorStringify, info } from "../logger";
import _ from "lodash";
import net from "net";

export const proxyServer = net.createServer();

type URLInfoType = {
    host: string,
    port: number,
    isTLSConnection: boolean
}

const parseURL = (data: string): URLInfoType => {
    info(data);
    const isTLSConnection = data.includes("CONNECT");
    const url = isTLSConnection
        ? data.toString().split(" ")[1]
        : data.toString()
            .split("Host: ")[1]
            .split("\r\n")[0];
    const sepIndex = url.lastIndexOf(":");
    const host = !~sepIndex ? url : url.substring(0, sepIndex);
    const port = !~sepIndex ? 80 : _.toNumber(url.substring(sepIndex + 1));
    return { host, port, isTLSConnection };
};

/*
    Variables `clientToProxySocket` and `proxyToServerSocket` are Net.Socket objects.
    Module Net it's a built-in NodeJS library.
    Class Net.Socket is an abstraction of a TCP socket.
 */
proxyServer.on("connection", clientToProxySocket => {
    debug("Client Connected To Proxy");
    clientToProxySocket.once("data", (data) => {
        try {
            const urlInfo = parseURL(data.toString());

            if (urlInfo.host === process.env.HOST_NAME ||
                urlInfo.port == _.toInteger(process.env.SERVER_PORT)) {
                const errorMessage = `Trying to proxy proxy server. [host = ${urlInfo.host},`
                                   + `port = ${urlInfo.port}]`;
                throw new Error(errorMessage);
            }

            debug("Connection info", urlInfo);
            const proxyToServerSocket = net.createConnection(urlInfo, () => {
                debug("PROXY TO SERVER SET UP");
                if (urlInfo.isTLSConnection) {
                    debug("HTTPS Request", data.toString());
                    clientToProxySocket.write("HTTP/1.1 200 OK\r\n\n");
                } else {
                    debug("HTTP REQUEST", data.toString());
                    proxyToServerSocket.write(data);
                }
                clientToProxySocket.pipe(proxyToServerSocket);
                proxyToServerSocket.pipe(clientToProxySocket);
            });
            proxyToServerSocket.on("error", err => {
                error("PROXY TO SERVER ERROR", err);
            });
            clientToProxySocket.on("error", err => {
                error("CLIENT TO PROXY ERROR", err);
            });
        } catch (e: any) {
            clientToProxySocket.write(`Received request:\n${data.toString()}\n`);
            clientToProxySocket.write(`Error info: ${e.message}`);
            error(e.message);
            clientToProxySocket.end();
            return;
        }
    });
});

proxyServer.on("close", () =>
    debug("Client disconnected")
);
proxyServer.on("error", err =>
    errorStringify("SERVER ERROR", err)
);
