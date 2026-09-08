const ws = new WebSocket("ws://localhost:3000/ws");

ws.addEventListener("open", () => {
  console.log("Connected!");
});

ws.addEventListener("message", (event) => {
  console.log("Received:", event.data);
});
