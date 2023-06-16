import React, {useCallback, useMemo, useRef} from "react";
import {ParallaxProvider} from "react-scroll-parallax";
import NavBar from "./Components/NavBar";
import styles from './App.module.scss';
import AppBody from "./Components/AppBody";
import {SECTION_TYPES} from "./constants";
import BasePage from "./Components/BasePage";

function App() {
    const parallaxContainerRef = useRef();
    return (
        <BasePage parallaxContainerRef={parallaxContainerRef}/>
    );
}

export default App;
