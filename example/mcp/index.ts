import { VCCPServer } from "@vccp/server";

const server = new VCCPServer({
  port: 3000,
  host: "localhost",
});

server.start().then(() => {
  console.log("VCCP Server is running");
});
