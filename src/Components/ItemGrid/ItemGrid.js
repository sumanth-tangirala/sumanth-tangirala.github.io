import React, { memo } from "react";

import cx from "classnames";
import _map from "lodash/map";
import _isNil from "lodash/isNil";
import _noop from "lodash/noop";

import styles from "./ItemGrid.module.scss";
import { SECTION_TYPE_VS_NAME } from "constants.js";
import { scrollParentToChild } from "helpers";
import ItemDetailsPanel from "./ItemDetailsPanel";
import PropTypes from "prop-types";

class ItemGrid extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      openItemIdx: undefined,
    };

    this.itemRefs = _map(props.items, () => React.createRef());
    this.gridRef = React.createRef();

    this.toggleItemDetails = this.toggleItemDetails.bind(this);
    this.renderItems = this.renderItems.bind(this);
    this.renderItemDetails = this.renderItemDetails.bind(this);
    this.closeItemDetails = this.closeItemDetails.bind(this);
  }

  toggleItemDetails(idx) {
    if (this.props.disableCardDetails) return _noop;
    const isDetailsVisible = !_isNil(this.state.openItemIdx);
    if (!isDetailsVisible) {
      this.props.containerRef.current.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => {
        if (this.itemRefs[idx].current) {
          console.log("hi");
          scrollParentToChild(
            this.gridRef.current,
            this.itemRefs[idx].current,
            100,
            150,
          );
        } else {
          console.warn("No ref found for idx", idx);
        }
      }, 200);
    }

    this.setState({
      openItemIdx: idx,
    });
  }

  closeItemDetails() {
    this.setState({ openItemIdx: undefined });
  }

  renderItems() {
    const { openItemIdx } = this.state;
    const isDetailsVisible = !_isNil(openItemIdx);

    const ItemCard = this.props.itemCardComponent;
    return (
      <div className={cx(styles.itemsContainer)}>
        <div
          className={cx(
            this.props.sectionHeadingClassName,
            styles.sectionHeading,
          )}
        >
          {SECTION_TYPE_VS_NAME[this.props.sectionName]}
        </div>

        <div className={cx(styles.itemsGrid)} ref={this.gridRef}>
          {_map(this.props.items, (Item, idx) => (
            <ItemCard
              cardRef={this.itemRefs[idx]}
              key={idx}
              idx={idx}
              toggleCardDetails={this.toggleItemDetails}
              isDetailsVisible={isDetailsVisible}
              selectedIdx={openItemIdx}
              {...Item}
            />
          ))}
        </div>
      </div>
    );
  }

  renderItemDetails() {
    const isDetailsVisible = !_isNil(this.state.openItemIdx);
    return (
      <div className={cx(styles.itemDetails)}>
        {
          <ItemDetailsPanel
            item={this.props.items[this.state.openItemIdx]}
            itemDetailsContentComponent={this.props.itemDetailsContentComponent}
            closeDetailsPanel={this.closeItemDetails}
            isVisible={isDetailsVisible}
            itemDetailsContentClassname={styles.itemDetailsContent}
          />
        }
      </div>
    );
  }

  render() {
    const isDetailsVisible = !_isNil(this.state.openItemIdx);
    return (
      <div
        className={cx(styles.container, this.props.className, {
          [styles.detailsVisible]: isDetailsVisible,
        })}
        ref={this.props.containerRef}
      >
        {this.renderItems()}
        {this.renderItemDetails()}
      </div>
    );
  }
}

ItemGrid.propTypes = {
  disableCardDetails: PropTypes.bool,
};

ItemGrid.defaultProps = {
  disableCardDetails: false,
};

export default memo(ItemGrid);
