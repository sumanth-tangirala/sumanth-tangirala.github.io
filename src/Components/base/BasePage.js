import React, {useRef} from 'react';

import {ParallaxProvider} from 'react-scroll-parallax';

import NavBar from "../NavBar";
import AppBody from "../AppBody";

import styles from './basePage.module.scss';
import Name from "../Name";


BasePage.propTypes = {

};

const START_NAVBAR_HEIGHT = 4.8
const END_NAVBAR_HEIGHT = 3.2

const TITLE_START_FONT_SIZE = 4.8;
const TITLE_END_FONT_SIZE = 2.4;

const TITLE_TOP_START_POSITION = 40;
const TITLE_TOP_END_POSITION = 0.1;

const TITLE_START_WIDTH = 100;
const TITLE_END_WIDTH = 28;

function calculateNewValueAfterScroll(startValue, endValue, scrollPercent, delayFactor=1){
    scrollPercent = scrollPercent ** delayFactor;
    return (endValue**scrollPercent) * (startValue ** (1-scrollPercent))
}

function BasePage(props) {
    const containerRef = useRef();
    const navBarRef = useRef();
    const nameTitleRef = useRef();
    const handleScroll = (event) => {
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0) - 60;
        const scrollTop = event.target.scrollTop;
        console.log(scrollTop, vh)
        const scrollPercent = (scrollTop/vh)

        if (scrollTop < vh) {
            const new_height = calculateNewValueAfterScroll(START_NAVBAR_HEIGHT, END_NAVBAR_HEIGHT, scrollPercent)
            navBarRef.current.style.height = String(new_height) + 'rem';

            const new_title_font_size = calculateNewValueAfterScroll(TITLE_START_FONT_SIZE, TITLE_END_FONT_SIZE, scrollPercent, .5);
            nameTitleRef.current.style.fontSize = String(new_title_font_size) + 'rem';

            const new_title_top_position = calculateNewValueAfterScroll(TITLE_TOP_START_POSITION, TITLE_TOP_END_POSITION, scrollPercent, 3)
            nameTitleRef.current.style.top = String(new_title_top_position) + '%';

            const new_title_width = calculateNewValueAfterScroll(TITLE_START_WIDTH, TITLE_END_WIDTH, scrollPercent, 3)
            nameTitleRef.current.style.width = String(new_title_width) + '%';
        }
        else {
            navBarRef.current.style.height = String(END_NAVBAR_HEIGHT) + 'rem';
            nameTitleRef.current.style.fontSize = String(TITLE_END_FONT_SIZE) + 'rem';
            nameTitleRef.current.style.top = String(TITLE_TOP_END_POSITION) + '%';
            nameTitleRef.current.style.width = String(TITLE_END_WIDTH) + '%';
        }

    }

    return (
        <ParallaxProvider scrollContainer={containerRef.current}>
            <div className={styles.container} ref={containerRef} onScroll={handleScroll}>
                <NavBar className={styles.navBar} navBarRef={navBarRef}/>
                <AppBody className={styles.appBody}/>
                <Name nameTitleRef={nameTitleRef}/>
            </div>
        </ParallaxProvider>
    );
}

export default BasePage;