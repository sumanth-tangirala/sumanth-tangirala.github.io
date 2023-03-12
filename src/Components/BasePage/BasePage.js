import React, {useCallback, useMemo, useRef} from 'react';
import { ParallaxProvider } from 'react-scroll-parallax';

import NavBar from "../NavBar";
import AppBody from "../AppBody";
import Name from "../Name";

// import { SECTION_TYPES}

import styles from './basePage.module.scss';
import {SECTION_TYPES} from "../../constants";


BasePage.propTypes = {

};

const START_NAVBAR_HEIGHT = 4.8
const END_NAVBAR_HEIGHT = 3.2

const TITLE_START_FONT_SIZE = 4.8;
const TITLE_END_FONT_SIZE = 2.4;

const TITLE_TOP_START_POSITION = 0.0001;
const TITLE_TOP_END_POSITION = 43;

const TITLE_START_WIDTH = 100;
const TITLE_END_WIDTH = 28;

// function calculateExponentialNewValue(startValue, endValue, scrollPercent, delayFactor=1){
//     scrollPercent = scrollPercent ** delayFactor;
//     return (endValue**scrollPercent) * (startValue ** (1-scrollPercent))
// }

function calculateLinearNewValue(startValue, endValue, scrollPercent, delayFactor=1){
    scrollPercent = scrollPercent ** 1;
    return startValue + ((endValue - startValue) * scrollPercent)
}

function calculateNewValueAfterScroll(startValue, endValue, scrollPercent, delayFactor){
    return calculateLinearNewValue(startValue, endValue, scrollPercent, delayFactor)
}

function BasePage(props) {
    const navBarRef = useRef();
    const appBodyRef = useRef();
    const nameTitleRef = useRef();

    const landingSectionRef=useRef();
    const aboutSectionRef = useRef();
    const skillsSectionRef = useRef();
    const timelineSectionRef = useRef();
    const projectsSectionRef = useRef();
    const contactSectionRef = useRef();

    const sectionRefs = useMemo(() => ({
        [SECTION_TYPES.LANDING]: landingSectionRef,
        [SECTION_TYPES.ABOUT]: aboutSectionRef,
        [SECTION_TYPES.SKILLS]: skillsSectionRef,
        [SECTION_TYPES.TIMELINE]: timelineSectionRef,
        [SECTION_TYPES.PROJECTS]: projectsSectionRef,
        [SECTION_TYPES.CONTACT]: contactSectionRef,
    }), [])

    const handleScroll = useCallback((event) => {
        // const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0) - 60;
        // const scrollTop = event.target.scrollTop;
        // const scrollPercent = (scrollTop/vh)
        //
        // if (scrollTop < vh) {
        //     const new_height = calculateNewValueAfterScroll(START_NAVBAR_HEIGHT, END_NAVBAR_HEIGHT, scrollPercent)
        //     navBarRef.current.style.height = String(new_height) + 'rem';
        //
        //     const new_title_font_size = calculateNewValueAfterScroll(TITLE_START_FONT_SIZE, TITLE_END_FONT_SIZE, scrollPercent, .5);
        //     nameTitleRef.current.style.fontSize = String(new_title_font_size) + 'rem';
        //
        //     const new_title_top_position = -1 * calculateNewValueAfterScroll(TITLE_TOP_START_POSITION, TITLE_TOP_END_POSITION, scrollPercent, .11)
        //     nameTitleRef.current.style.transform = "translateY(" + String(new_title_top_position) + 'vh)';
        //
        //     const new_title_width = calculateNewValueAfterScroll(TITLE_START_WIDTH, TITLE_END_WIDTH, scrollPercent, 3)
        //     nameTitleRef.current.style.width = String(new_title_width) + '%';
        // }
        // else {
        //     navBarRef.current.style.height = String(END_NAVBAR_HEIGHT) + 'rem';
        //     nameTitleRef.current.style.fontSize = String(TITLE_END_FONT_SIZE) + 'rem';
        //     nameTitleRef.current.style.transform = "translateY(" + String(-1 * TITLE_TOP_END_POSITION) + 'vh)';
        //     nameTitleRef.current.style.width = String(TITLE_END_WIDTH) + '%';
        // }

    }, [])

    const onNavigation = useCallback((section) => {
        const sectionRef = sectionRefs[section];
        sectionRef.current.scrollIntoView({ behavior: 'smooth'});
    }, [sectionRefs])

    return (
        <div className={styles.container}>
            <AppBody className={styles.appBody} handleScroll={handleScroll} appBodyRef={appBodyRef} sectionRefs={sectionRefs}/>
        </div>
    );
}

export default BasePage;