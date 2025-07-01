import React, { memo, useCallback, useMemo } from "react";
import Media from "react-media";
import cx from "classnames";
import { Dropdown } from "antd";
import { ReactComponent as MenuSvg } from "./menu.svg";

import _filter from "lodash/filter";
import _reduce from "lodash/reduce";
import _includes from "lodash/includes";

import text from "text";

import styles from "./navBar.module.scss";
import {
  SECTION_TYPES,
  SECTION_ORDER,
  SECTION_TYPE_VS_NAME,
} from "../../constants";
import _map from "lodash/map";

const NavBar = memo(({ className, navBarRef, handleNavigation, showName }) => {
  const sectionsToDisplay = useMemo(() => {
    const sectionsToHide = [SECTION_TYPES.LANDING, SECTION_TYPES.HISTORY, ...((text.hiddenSections) || [])];
    return _filter(
      SECTION_ORDER,
      (sectionType) => !_includes(sectionsToHide, sectionType),
    );
  }, [text.hiddenSections]);

  const sectionMenuItems = useMemo(() => [
    ..._map(sectionsToDisplay, (sectionType) => ({
      key: sectionType,
      label: (
        <span className={styles.menuItem}>
          {SECTION_TYPE_VS_NAME[sectionType]}
        </span>
      ),
    })),
    {
      key: "Resume",
      label: <span className={styles.menuItem}>Resume</span>,
    },
  ], [sectionsToDisplay]);
  const sectionTypeVsNavigationFunc = useMemo(() => {
    const getHandleNavigation = (sectionType) => () => {
      handleNavigation(sectionType);
    };

    return _reduce(
      SECTION_TYPES,
      (acc, sectionType) => ({
        ...acc,
        [sectionType]: getHandleNavigation(sectionType),
      }),
      {},
    );
  }, [handleNavigation]);

  const openResume = useCallback(() => {
    window.open(text.resumeURL, "_blank");
  }, []);

  const dropDownMenuProp = useMemo(() => {
    return {
      items: sectionMenuItems,
      onClick: ({ key: sectionType }) => {
        if (sectionType === "Resume") {
          openResume();
          return;
        }
        handleNavigation(sectionType);
      },
    };
  }, [handleNavigation, openResume]);

  const renderActions = () => (
    <div className={styles.actions}>
      {_map(sectionsToDisplay, (sectionType) => (
        <div
          onClick={sectionTypeVsNavigationFunc[sectionType]}
          className={styles.navBarItem}
          key={sectionType}
        >
          {SECTION_TYPE_VS_NAME[sectionType]}
        </div>
      ))}
      <div className={styles.navBarItem} onClick={openResume}>
        Resume
      </div>
    </div>
  );

  const renderMenu = () => (
    <Dropdown
      menu={dropDownMenuProp}
      placement="bottomRight"
      className={styles.menu}
      trigger="click"
      overlayClassName={styles.darkDropdown}
    >
      <MenuSvg className={styles.menuIcon} />
    </Dropdown>
  );

  return (
    <div
      className={cx(
        styles.container,
        { [styles.collapsed]: !showName },
        className,
      )}
      ref={navBarRef}
    >
      <div
        className={cx(styles.name, { [styles.nameHidden]: !showName })}
        onClick={sectionTypeVsNavigationFunc[SECTION_TYPES.LANDING]}
      >
        {text.name}
      </div>
      <Media
        queries={{
          small: "(max-width: 750px)",
          large: "(min-width: 750px)",
        }}
      >
        {(matches) => (
          <>
            {matches.small && renderMenu()}
            {matches.large && renderActions()}
          </>
        )}
      </Media>
    </div>
  );
});

NavBar.propTypes = {};

NavBar.defaultProps = {
  handleNavigation: () => { },
};

export default NavBar;
