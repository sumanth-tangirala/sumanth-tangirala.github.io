import React, {useCallback, useMemo} from 'react';
import cx from 'classnames';
import { Button, Dropdown } from 'antd';
import { ReactComponent as MenuSvg } from './menu.svg';
import _filter from 'lodash/filter';
import _reduce from 'lodash/reduce';

import basicData from 'text/text.json';

import styles from './navBar.module.scss';
import {SECTION_TYPES, SECTION_ORDER, SECTION_TYPE_VS_NAME} from "../../constants";
import _map from "lodash/map";
import {logDOM} from "@testing-library/react";

const sectionsToDisplay = _filter(SECTION_ORDER, sectionType => sectionType !== SECTION_TYPES.LANDING)

const sectionMenuItems = _map(sectionsToDisplay, sectionType => ({
    key: sectionType,
    label: (<span className={styles.menuItem}>{SECTION_TYPE_VS_NAME[sectionType]}</span>),
}));

function NavBar({className, navBarRef, handleNavigation}) {

    const sectionTypeVsNavigationFunc = useMemo(() => {
        const getHandleNavigation = (sectionType) => () => {
            handleNavigation(sectionType)
        }

        return _reduce(SECTION_TYPES, (acc, sectionType) => ({
            ...acc,
            [sectionType]: getHandleNavigation(sectionType),
        }), {})

    }, [handleNavigation])

    const dropDownMenuProp = useMemo(() => {
        return {
            items: sectionMenuItems,
            onClick: ({key:sectionType}) => {
                handleNavigation(sectionType)
            },
        }
    }, [handleNavigation])

    const renderActions = () => (
        <div className={styles.actions}>
            {_map(sectionsToDisplay, sectionType => (
                <Button
                    type="link"
                    onClick={sectionTypeVsNavigationFunc[sectionType]}
                    className={styles.navBarItem}
                    key={sectionType}
                >
                    {SECTION_TYPE_VS_NAME[sectionType]}
                </Button>
            ))}
            <Button type="link" className={styles.navBarItem}>Resume</Button>
        </div>
    )

    const renderMenu = () => (
        <Dropdown
            menu={dropDownMenuProp}
            placement="bottomRight"
            className={styles.menu}
            onSelect={() => {
                console.log('ehy')
            }}
        >
            <MenuSvg className={styles.menuIcon}/>
        </Dropdown>
    );

    return (
        <div className={cx(styles.container, className)} ref={navBarRef}>
            <div
                className={styles.name}
                onClick={sectionTypeVsNavigationFunc[SECTION_TYPES.LANDING]}
            >
                {basicData.name}
            </div>
            {renderActions()}
            {renderMenu()}
        </div>
    );
}

NavBar.propTypes = {

};

NavBar.defaultProps = {
    handleNavigation: () => {},
};



export default NavBar;