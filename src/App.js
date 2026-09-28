import React from "react";
import { ConfigProvider } from "antd";
import { MotionConfig } from "framer-motion";
import BasePage from "./Components/BasePage";
import { FONT_STACK } from "./constants";

const ANTD_THEME = { token: { fontFamily: FONT_STACK } };

function App() {
  return (
    <ConfigProvider theme={ANTD_THEME}>
      <MotionConfig reducedMotion="user">
        <BasePage />
      </MotionConfig>
    </ConfigProvider>
  );
}

export default App;
