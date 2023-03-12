import './App.css';
import BasePage from "./Components/BasePage";
import styles from "./Components/BasePage/basePage.module.scss";
import NavBar from "./Components/NavBar";
import React, {useRef} from "react";

function App() {
    const navBarRef = useRef()
    const onNavigation = () => {

    }

    return (
    <div className="App">
        <NavBar className={styles.navBar} navBarRef={navBarRef} handleNavigation={onNavigation}/>
        <BasePage />
    </div>
    );
}

export default App;
