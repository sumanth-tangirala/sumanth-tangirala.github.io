import React, { memo } from "react";

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
    if ((text.hiddenSections || []).includes(SECTION_TYPES.SKILLS)) {
      return null;
    }

    return (
      <ItemGrid
        containerRef={this.props.sectionRef}
        items={text.skills}
        itemCardComponent={SkillCard}
        itemDetailsContentComponent={SkillDetailsPanel}
        sectionName={SECTION_TYPES.SKILLS}
        sectionHeadingClassName={this.props.sectionHeadingClassName}
        disableCardDetails={DISABLE_CARD_DETAILS}
        className={this.props.className}
      />
    );
  }
}

Skills.propTypes = {};

export default memo(Skills);
