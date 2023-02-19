import React from 'react';
import PropTypes from 'prop-types';

import {Parallax, ParallaxProvider} from 'react-scroll-parallax';

import './basePage.styles.scss';
import NavBar from "../NavBar";
import AppBody from "../AppBody";


BasePage.propTypes = {

};


function BasePage(props) {
    return (
        <ParallaxProvider>
            <div className='container'>
                <NavBar />
                <AppBody />
            </div>
        </ParallaxProvider>
    );
}

export default BasePage;