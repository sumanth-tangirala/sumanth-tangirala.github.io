import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import styles from './navBar.module.scss';

NavBar.propTypes = {
    
};

function NavBar({className, navBarRef}) {

    return (
        <div className={cx(styles.container, className)} ref={navBarRef}>
            Navbar
        </div>
    );
}

export default NavBar;