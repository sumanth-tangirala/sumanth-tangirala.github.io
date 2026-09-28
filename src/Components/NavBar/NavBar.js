import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import cx from "classnames";
import { Dropdown } from "antd";
import { LuLibrary, LuMenu } from "react-icons/lu";

import _filter from "lodash/filter";
import _reduce from "lodash/reduce";
import _includes from "lodash/includes";

import text from "text";

import styles from "./navBar.module.scss";
import {
  SECTION_TYPES,
  SECTION_ORDER,
  SECTION_TYPE_VS_ID,
  SECTION_TYPE_VS_NAME,
} from "../../constants";
import _map from "lodash/map";

// Below this width the section links move into the menu
const COMPACT_QUERY = "(max-width: 900px)";

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const onChange = () => setMatches(mediaQueryList.matches);
    mediaQueryList.addEventListener("change", onChange);
    onChange();
    return () => mediaQueryList.removeEventListener("change", onChange);
  }, [query]);

  return matches;
};

// How long the dismiss shield outlives a close it didn't cause (Esc, a swipe),
// so the tail of that gesture can't reach the page underneath
const SHIELD_LINGER_MS = 600;

const NavBar = memo(({ className, navBarRef, navNameRef, handleNavigation, showPill, showName }) => {
  const isCompact = useMediaQuery(COMPACT_QUERY);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // While the menu is open, a transparent shield covers the page so the tap
  // that dismisses the menu never also presses whatever is underneath
  const [isShieldUp, setIsShieldUp] = useState(false);

  const onMenuOpenChange = useCallback((open) => {
    setIsMenuOpen(open);
    if (open) setIsShieldUp(true);
    else setTimeout(() => setIsShieldUp(false), SHIELD_LINGER_MS);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
    setIsShieldUp(false);
  }, []);
  const sectionsToDisplay = useMemo(() => {
    const sectionsToHide = [
      SECTION_TYPES.LANDING,
      SECTION_TYPES.HISTORY,
      SECTION_TYPES.EXPERTISE, // a reference block, not a place to go
      ...((text.hiddenSections) || []),
    ];
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
  ], [sectionsToDisplay]);
  // Links to each section's address; a click scrolls there smoothly instead
  const sectionTypeVsNavigationFunc = useMemo(() => {
    const getHandleNavigation = (sectionType) => (event) => {
      event.preventDefault();
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

  const dropDownMenuProp = useMemo(() => {
    return {
      items: sectionMenuItems,
      onClick: ({ key: sectionType }) => {
        closeMenu();
        handleNavigation(sectionType);
      },
    };
  }, [handleNavigation, sectionMenuItems, closeMenu]);

  const renderActions = () => (
    <div className={styles.actions}>
      {_map(sectionsToDisplay, (sectionType) => (
        <a
          href={`#${SECTION_TYPE_VS_ID[sectionType]}`}
          onClick={sectionTypeVsNavigationFunc[sectionType]}
          className={styles.navBarItem}
          key={sectionType}
        >
          {SECTION_TYPE_VS_NAME[sectionType]}
        </a>
      ))}
    </div>
  );

  const renderScholarButton = () => (
    <a
      href={text.scholarDashboardURL}
      className={styles.scholarButton}
      title="Scholar dashboard"
      aria-label="Scholar dashboard"
    >
      <LuLibrary aria-hidden />
    </a>
  );

  const renderMenu = () => (
    <Dropdown
      menu={dropDownMenuProp}
      placement="bottomRight"
      trigger="click"
      open={isMenuOpen}
      onOpenChange={onMenuOpenChange}
      overlayClassName={styles.darkDropdown}
    >
      <button type="button" className={styles.menu} aria-label="Menu" aria-haspopup="menu" aria-expanded={isMenuOpen}>
        <LuMenu className={styles.menuIcon} aria-hidden />
      </button>
    </Dropdown>
  );

  return (
    <>
      {/* Fades content out before it reaches the floating pill; clear
          whenever the pill is, so nothing is cut by an invisible edge */}
      <div className={cx(styles.scrim, { [styles.scrimClear]: !showPill })} aria-hidden />
      {isShieldUp && (
        <div className={styles.menuShield} onClick={closeMenu} aria-hidden />
      )}
      <nav
        className={cx(styles.container, { [styles.atTop]: !showPill }, className)}
        ref={navBarRef}
      >
        <a
          href="#top"
          ref={navNameRef}
          className={cx(styles.name, { [styles.nameHidden]: !showName })}
          onClick={sectionTypeVsNavigationFunc[SECTION_TYPES.LANDING]}
          aria-hidden={!showName}
          tabIndex={showName ? undefined : -1}
        >
          {text.name}
        </a>
        {isCompact ? (
          <div className={styles.mobileControls}>
            {renderScholarButton()}
            {renderMenu()}
          </div>
        ) : (
          <>
            {renderActions()}
            {renderScholarButton()}
          </>
        )}
      </nav>
    </>
  );
});

NavBar.propTypes = {};

NavBar.defaultProps = {
  handleNavigation: () => { },
};

export default NavBar;
