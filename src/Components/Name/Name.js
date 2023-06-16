import React from 'react';

import styles from './name.module.scss';
import basicData from 'text/text.json';

Name.propTypes = {

};

function Name(props) {
    // const { ref: parallaxRef, element } = useParallax({
    //     translateY:["0vh", "-43vh"],
    //     translateX:[-50,-85],
    // });
    //
    // const progress = element?.progress;
    //
    // const fontSize = useMemo(() => {
    //     let newFontSize = TITLE_START_FONT_SIZE;
    //     if(progress !== undefined) {
    //         newFontSize = calculateNewValueAfterScroll(TITLE_START_FONT_SIZE, TITLE_END_FONT_SIZE, progress);
    //     }
    //
    //     return String(newFontSize) + 'rem';
    // }, [progress])

    return (
        <div
            className={styles.name}
            // ref={parallaxRef}
            // style={{fontSize}}
        >
            {basicData.name}
        </div>
    );
}

export default Name;