import React from 'react';

import styles from './name.module.scss';
import {Parallax, useParallax} from "react-scroll-parallax";

Name.propTypes = {

};

function Name(props) {
    return (
        <Parallax
            className={styles.name}
            translateY={[0, 1000]}
        >
                Sumanth Tangirala
        </Parallax>
    );
}

export default Name;