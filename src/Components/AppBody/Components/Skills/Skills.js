import React, { memo } from "react";

import cx from "classnames";

import ItemGrid from "../../../ItemGrid";

import text from "text";
import SkillCard from "./SkillCard";
import { SECTION_TYPES } from "../../../../constants";
import SkillDetailsPanel from "./SkillDetailsPanel";

const DISABLE_CARD_DETAILS = true;

class Skills extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isDetailsVisible: false,
    };
  }

  render() {
    return (
      <ItemGrid
        containerRef={this.props.sectionRef}
        items={text.skills}
        itemCardComponent={SkillCard}
        itemDetailsContentComponent={SkillDetailsPanel}
        sectionName={SECTION_TYPES.SKILLS}
        sectionHeadingClassName={this.props.sectionHeadingClassName}
        disableCardDetails={DISABLE_CARD_DETAILS}
      />
    );
  }
}

Skills.propTypes = {};

export default memo(Skills);
