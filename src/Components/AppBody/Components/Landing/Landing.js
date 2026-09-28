import React, { memo } from "react";
import styles from "./landing.module.scss";
import cx from "classnames";
import basicData from "text";
import { IS_PRERENDERED, mobileDesktopSwitcher, parse } from "../../../../helpers";
import { motion } from "framer-motion";
import PlannerBackground from "./PlannerBackground";
import ProfileLinks from "../../../ProfileLinks";

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

const PLANNER_OBSTACLE = { "data-planner-obstacle": "box" };

function Landing({ className, sectionRef, sectionProps, nameRef }) {
  return (
    <div className={cx(styles.landing, className)} ref={sectionRef} {...sectionProps}>
      <PlannerBackground heroRef={sectionRef} startDelay={IS_PRERENDERED ? 150 : 700} />
      <motion.div
        className={styles.container}
        variants={containerVariants}
        // Prerendered HTML is already on screen: don't hide it to replay the entrance
        initial={IS_PRERENDERED ? false : "hidden"}
        animate="visible"
      >
        {mobileDesktopSwitcher({
          mobile: (
            <motion.img
              src={basicData.landingMobilePicturePath}
              className={styles.image}
              alt={basicData.name}
              variants={itemVariants}
              data-planner-obstacle="box"
            />
          ),
          desktop: (
            <motion.img
              src={basicData.landingPicturePath}
              className={styles.image}
              alt={basicData.name}
              variants={itemVariants}
              data-planner-obstacle="box"
            />
          ),
        })}

        <motion.h1
          className={cx(styles.name)}
          variants={itemVariants}
          ref={nameRef}
          data-planner-obstacle="text"
        >
          {basicData.name}
        </motion.h1>
        <motion.div
          className={styles.tagline}
          variants={itemVariants}
          data-planner-obstacle="text"
          data-robot-start
        >
          {parse(basicData.tagline)}
        </motion.div>

        <motion.div className={styles.links} variants={itemVariants}>
          <ProfileLinks links={["email", "scholar", "linkedin", "github", "resume"]} linkProps={PLANNER_OBSTACLE} />
        </motion.div>
      </motion.div>
    </div>
  );
}

export default memo(Landing);
