import _, { range } from "lodash";
import { debug, errorStringify, info } from "../logger";
// @ts-ignore (Using module without types)
import raw from "raw-socket";

const split = (data: number, separatorBit: number) => {
    const lhs = data >> separatorBit;
    const rhs = data - (lhs << separatorBit);
    return [lhs, rhs] as const;
};

abstract class AbstractParser {
    private curOffset = 0;
    private temp = 0;

    public constructor (private buffer: Buffer) {}

    protected result: Record<string, number | number[]> = {};

    protected read = (bytes: number) => {
        this.temp = this.buffer.readUIntBE(this.curOffset, bytes);
        this.curOffset += bytes;
    };
    protected readFirstHalfByte = () => {
        this.temp = this.buffer.readUIntBE(this.curOffset, 1) >> 4;
    };
    protected readOtherHalfByte = () => {
        this.temp = this.buffer.readUIntBE(this.curOffset, 1) - (this.temp << 4);
    };
    protected save = (propertyName: string) => {
        this.result[propertyName] = this.temp;
    };
    protected saveProps = (propertyNames: [string, string], splitBit: number) => {
        const [lhs, rhs] = split(this.temp, splitBit);
        const [lhsName, rhsName] = propertyNames;
        this.temp = lhs;
        this.save(lhsName);
        this.temp = rhs;
        this.save(rhsName);
    };
    protected getTemp = () => this.temp;
}

class IPPacketParser extends AbstractParser {
    private readIP = () => {
        return range(0,4).map(() => {
            this.read(1);
            return this.getTemp();
        });
    };

    private parseIPPacket = () => {
        this.read(1);
        this.saveProps(["IPv", "headerLength"], 4);
        this.read(1);
        this.saveProps(["dss", "enc"], 6);
        this.read(2);
        this.save("totalLength");
        this.read(2);
        this.save("identification");
        this.read(2);
        this.saveProps(["flags", "fragmentOffset"], 3);
        this.read(1);
        this.save("ttl");
        this.read(1);
        this.save("protocol");
        this.read(2);
        this.save("checksum");
        this.result["sourceIP"] = this.readIP();
        this.result["destIP"] = this.readIP();
    };

    /*
        This method parses the package incompletely
     */
    private parseTCPPacket = () => {
        this.read(2);
        this.save("sourcePort");
        this.read(2);
        this.save("destinationPort");
        this.read(4);
        this.save("sequenceNumber");
        this.read(4);
        this.save("acknowledgmentNumber");
        this.readFirstHalfByte();
        this.save("headerLength");
        this.readOtherHalfByte();
        this.saveProps(["reserver", "nonce"], 3);
        this.read(1);
        this.save("TCP Flags");
        this.read(2);
        this.save("Window size");
        this.read(2);
        this.save("checksum");
        this.read(2);
        this.save("urgent pointer");
    };

    public parse = () => {
        if (Object.keys(this.result).length !== 0) {
            debug("Packet already parsed");
            return this.result;
        }
        this.parseIPPacket();
        if (this.result.protocol === 6) {
            this.parseTCPPacket();
        }
        return this.result;
    };

    public getResult = () => {
        return this.result;
    };
}

export const traceTCPPackets = () => {
    const socket = raw.createSocket({
        addressFamily: raw.AddressFamily.IPv4,
        protocol: raw.Protocol.TCP,
    });

    socket.on("message", (buffer: Buffer, source: string) => {
        const parsedPacket = (new IPPacketParser(buffer)).parse();
        const proxyPort = _.toInteger(process.env.SERVER_PORT);
        if (parsedPacket["protocol"] == 6 &&
            (parsedPacket.sourcePort == proxyPort || parsedPacket.destinationPort == proxyPort)) {
            debug("received " + buffer.length + " bytes from " + source);
            const source_ip = parsedPacket.sourceIP as number[];
            const dest_ip = parsedPacket.destIP as number[];
            info(`${source_ip.join(".")}:${parsedPacket.sourcePort} ->`
                  + `${dest_ip.join(".")}:${parsedPacket.destinationPort}`);
        }
    });

    socket.on("close", () => {
        info("socket closed");
    });
    socket.on("error", (err: string) => {
        errorStringify(err);
    });

    setInterval(() => {
        if (socket.recvPaused) {
            debug("Unpause");
            socket.resumeRecv();
        }
    }, 1000);
};
