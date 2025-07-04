import React, { memo } from "react";
import styles from "./landing.module.scss";
import cx from "classnames";
import basicData from "text";
import { mobileDesktopSwitcher, parse } from "../../../../helpers";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

function Landing({ className, sectionRef, nameRef }) {
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
      </motion.div>
    </div>
  );
}

export default memo(Landing);
