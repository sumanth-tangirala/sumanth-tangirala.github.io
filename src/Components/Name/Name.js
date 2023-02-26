import React from 'react';
import PropTypes from 'prop-types';

import styles from './name.module.scss';

Name.propTypes = {

};

function Name({nameTitleRef}) {
    return (
        <div
            className={styles.name}
            ref={nameTitleRef}
        >
            Sumanth Tangirala
        </div>
    );
}

export default Name;