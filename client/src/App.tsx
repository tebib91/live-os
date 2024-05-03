import React from "react";
import { AppBar, Toolbar, Typography } from "@mui/material";
function App() {
  return (
    <div className="App">
      {" "}
      <AppBar position="static">
        {" "}
        <Toolbar variant="dense">
          {" "}
          <Typography variant="h6" color="inherit">
            {" "}
            Live-os{" "}
          </Typography>{" "}
        </Toolbar>{" "}
      </AppBar>{" "}
      <div className="content"> Welcome to Live-os! </div>{" "}
    </div>
  );
}
export default App;
