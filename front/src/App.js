import "./App.css";
import socketIoClient from "socket.io-client";
import { useEffect, useState } from "react";

function App() {
  const [socket, setSocket] = useState();
  const [state, setState] = useState();

  useEffect(() => {
    if (!socket) {
      setSocket(socketIoClient("http://localhost:4000"));
      return;
    }

    console.log(socket);
    socket.on("hello", (socketResponse) => {
      console.log("socketResponse", socketResponse);
    });
  }, [socket]);

  const onClickButton = () => {
    socket.emit("chat", "Chat chat!");
  };

  return (
    <div className="App">
      <input type="text"></input>
      <button onClick={onClickButton}>Send message</button>
    </div>
  );
}

export default App;
