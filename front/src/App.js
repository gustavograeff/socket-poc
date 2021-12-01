import "./App.css";
import { useEffect, useState } from "react";

function App() {
  const [socket, setSocket] = useState();
  const [state, setState] = useState();

  useEffect(() => {
    if (!socket) {
      setSocket(new WebSocket("ws://localhost:4000"));
      return;
    }

    socket.onmessage = (socketMessageEvent) => {
      console.log("socket message", socketMessageEvent);
    };
  }, [socket]);

  const onClickButton = () => {
    socket.send("Hello server, here is client talking!");
  };

  return (
    <div className="App">
      <input type="text"></input>
      <button onClick={onClickButton}>Send message</button>
    </div>
  );
}

export default App;
