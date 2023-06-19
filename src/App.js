import React, {useRef} from "react";
import BasePage from "./Components/BasePage";

function App() {
    const parallaxContainerRef = useRef();
    return (
        <BasePage parallaxContainerRef={parallaxContainerRef}/>
    );
}

export default App;
