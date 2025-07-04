import React, { memo } from "react";
import styles from "./landing.module.scss";
import cx from "classnames";
import basicData from "text";
import { mobileDesktopSwitcher, parse } from "../../../../helpers";
import { motion } from "framer-motion";
import { SECTION_TYPES } from "../../../../constants";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 90,
      damping: 15,
      mass: 0.6,
    },
  },
};

function Landing({ className, sectionRef, nameRef, handleNavigation }) {
  return (
    <div className={cx(styles.landing, className)} ref={sectionRef}>
      <motion.div
        className={styles.container}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {mobileDesktopSwitcher({
          mobile: (
            <motion.img
              src={basicData.landingMobilePicturePath}
              className={styles.image}
              alt={basicData.name}
              variants={itemVariants}
            />
          ),
          desktop: (
            <motion.img
              src={basicData.landingPicturePath}
              className={styles.image}
              alt={basicData.name}
              variants={itemVariants}
            />
          ),
        })}

        <motion.div
          className={cx(styles.name)}
          variants={itemVariants}
          ref={nameRef}
        >
          {basicData.name}
        </motion.div>
        <motion.div className={styles.tagline} variants={itemVariants}>
          {parse(basicData.tagline)}
        </motion.div>

        {/* Action Buttons */}
        <motion.div className={styles.actions} variants={itemVariants}>
          <motion.button
            className={styles.actionButton}
            variants={itemVariants}
            onClick={() => handleNavigation && handleNavigation(SECTION_TYPES.PUBLICATIONS)}
          >
            View Work
          </motion.button>
          <motion.button
            className={styles.actionButton}
            variants={itemVariants}
            onClick={() => handleNavigation && handleNavigation(SECTION_TYPES.CONTACT)}
          >
            Get in Touch
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default memo(Landing);
