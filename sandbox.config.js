/** @type {import("@akashic/sandbox-configuration").SandboxConfiguration} */
module.exports = {
  autoSendEventName: process.argv[1].match("sandbox") ? "mySessionParameter" : undefined,
  events: {
    mySessionParameter: [
      [
        32, // g.MessageEventを示す0x20
        0,
        ":akashic", // プレイヤーID
        {
          type: "start", // セッションパラメータであることを示すstart
          parameters: {
            mode: "ranking",
            totalTimeLimit: 120,
          },
        },
      ],
    ],
  },
  displayOptions: {
    fitsToScreen: true,
    backgroundColor: "black",
  },
};
