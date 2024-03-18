import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

import styles from "./ItemDetailsPanel.module.scss";
import { CloseOutlined } from "@ant-design/icons";
import cx from "classnames";
import { Button } from "antd";

function ItemDetailsPanel({
  item,
  itemDetailsContentComponent,
  closeDetailsPanel,
  isVisible,
  itemDetailsContentClassname,
}) {
  const ItemDetailsContentComponent = itemDetailsContentComponent;
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  useEffect(() => {
    if (!isVisible) setIsDetailsVisible(false);
    else {
      setTimeout(() => {
        setIsDetailsVisible(isVisible);
      }, 1000);
    }
  }, [isVisible]);

  return (
    <div className={styles.container}>
      {isDetailsVisible && isVisible && (
        <>
          <div className={styles.skillDetailHeading}>
            <div className={cx(styles.sectionHeading)}>{item.title}</div>
            <Button
              icon={<CloseOutlined />}
              type="text"
              className={cx(styles.closeDetailsButton)}
              onClick={closeDetailsPanel}
              size="large"
            />
          </div>
          <div className={cx(itemDetailsContentClassname, styles.content)}>
            <ItemDetailsContentComponent item={item} />
          </div>
        </>
      )}
    </div>
  );
}

ItemDetailsPanel.propTypes = {};

export default ItemDetailsPanel;
