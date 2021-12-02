// Important reading: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers
// Useful links:
// https://dustinpfister.github.io/2019/11/20/nodejs-websocket/
// https://medium.com/hackernoon/implementing-a-websocket-server-with-node-js-d9b78ec5ffa8

const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const crypto = require("crypto");
// const { Buffer } = require("buffer");
// const buff5 = Buffer.alloc(5, 'Hello World!', 'utf-8');

const WebSocketOperationCodeEnum = {
  FINAL: 0x80, // decimal 128
  CLOSE: 0x8, // decimal 8
  STRING: 0x1, // decimal 1
};

const WebSocketBytesOffset = {
  OPERATION_CODE: 0,
  PAYLOAD_LENGTH: 1,
  MASK_KEY_CLIENT: 2,
  DATA_CLIENT: 6,
};

const WebSocketShiftMaskBitsAmount = {
  0: 24,
  1: 16,
  2: 8,
  3: 0,
};

const bitWiseComparator4Bits = 0xf; // decimal 15 - binary 1111
const bitWiseComparator7Bits = 0x7f; // decimal 127 - binary 1111111
const bitWiseComparator8Bits = 0xff; // decimal 128 - binary 11111111

app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");

  next();
});

app.get("/", (req, res) => {
  res.send("Hello!");
});

const sendTextFrame = function (socket, text) {
  // Check doc:
  // https://www.rfc-editor.org/rfc/rfc6455#section-11.8
  // https://www.rfc-editor.org/rfc/rfc6455#section-5.2
  // https://www.rfc-editor.org/rfc/rfc6455#section-5.6

  const payload = Buffer.from(text, "utf-8");

  // Merge all buffers resulting in some hexadecimal values with the entire data
  const frame = Buffer.concat([
    Buffer.from([
      WebSocketOperationCodeEnum.FINAL + WebSocketOperationCodeEnum.STRING,
    ]),
    Buffer.from([payload.length]),
    payload,
  ]);

  // Send data to client
  socket.write(frame, "utf-8");
};

const genAcceptKey = (req) => {
  // Check doc:
  // https://www.rfc-editor.org/rfc/rfc6455#page-7
  // https://www.rfc-editor.org/rfc/rfc6455#page-24

  const GUID_FROM_DOC = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
  const webSocketHeader = req.headers["sec-websocket-key"];

  // We need this sha1 hash to ensure the socket handshake
  const sha1 = crypto.createHash("sha1");

  sha1.update(webSocketHeader + GUID_FROM_DOC);

  return sha1.digest("base64");
};

const acceptUpgrade = (req, socket) => {
  const acceptKey = genAcceptKey(req);

  // Response based on doc: https://www.rfc-editor.org/rfc/rfc6455#section-1.2
  const responseHeaders = [
    "HTTP/1.1 101 Web Socket Protocols",
    "Upgrade: WebSocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${acceptKey}`,
    "\r\n",
  ].join("\r\n");

  // Send correct headers to respond client
  socket.write(responseHeaders);
};

const handleClientWebSocketData = (clientData) => {
  const webSocketClientOperationByte = clientData.readUInt8(
    WebSocketBytesOffset.OPERATION_CODE
  );

  // & is used to ignore every bit which doesn't correspond to opcode
  // https://www.rfc-editor.org/rfc/rfc6455#section-5.2
  const opCode = webSocketClientOperationByte & bitWiseComparator4Bits;

  if (opCode === WebSocketOperationCodeEnum.CLOSE) return null; // This null signify it's a connection termination frame

  if (opCode !== WebSocketOperationCodeEnum.STRING) return; // We just wanna string for now

  const webSocketPayloadLengthByte = clientData.readUInt8(
    WebSocketBytesOffset.PAYLOAD_LENGTH
  );

  // & is used to ignore every bit which doesn't correspond to payload length
  const payloadLength = webSocketPayloadLengthByte & bitWiseComparator7Bits;

  // Browser always mask the frame
  // "The masking key is a 32-bit value chosen at random by the client"
  // https://www.rfc-editor.org/rfc/rfc6455#page-30.
  // https://www.rfc-editor.org/rfc/rfc6455#section-5.3
  const clientWebSocketFrameMask = clientData.readUInt32BE(
    WebSocketBytesOffset.MASK_KEY_CLIENT
  );

  const responseBuffer = new Buffer.alloc(
    clientData.length - WebSocketBytesOffset.DATA_CLIENT
  );

  let webSocketFrameByteIndex = WebSocketBytesOffset.DATA_CLIENT;

  // This loop is based on doc: https://www.rfc-editor.org/rfc/rfc6455#section-5.3
  for (let i = 0, j = 0; i < payloadLength; ++i, j = i % 4) {
    const mask =
      (clientWebSocketFrameMask >> WebSocketShiftMaskBitsAmount[j]) &
      bitWiseComparator8Bits; // & is used to ignore every bit which doesn't correspond to mask

    const source = clientData.readUInt8(webSocketFrameByteIndex); // receive hexadecimal, return decimal

    responseBuffer.writeUInt8(source ^ mask, i);

    webSocketFrameByteIndex++;
  }

  console.log("Client websocket frame =", responseBuffer.toString("utf-8"));
};

const runWebSocket = () => {
  server.on("upgrade", (req, socket, head) => {
    acceptUpgrade(req, socket);
    sendTextFrame(socket, "Hey client, this is server talking!");

    socket.on("data", handleClientWebSocketData);
  });

  server.listen(4000);

  return server;
};

runWebSocket();
