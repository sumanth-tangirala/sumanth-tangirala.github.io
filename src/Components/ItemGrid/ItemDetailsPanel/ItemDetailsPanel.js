import React, { useEffect, useState } from "react";

import styles from "./ItemDetailsPanel.module.scss";
import { CloseOutlined, RightOutlined } from "@ant-design/icons";
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
      }, 600);
    }
  }, [isVisible]);

  return (
    <div
      className={cx(styles.container, {
        [styles.visibleContainer]: isDetailsVisible,
      })}
    >
      {isDetailsVisible && isVisible && (
        <div className={styles.detailsContainer}>
          <Button
            icon={<RightOutlined />}
            type="text"
            className={cx(styles.closeDetailsButton)}
            onClick={closeDetailsPanel}
            size="large"
          />
          <div className={styles.contentContainer}>
            <div className={styles.skillDetailHeading}>
              <div className={cx(styles.sectionHeading)}>{item.title}</div>
            </div>
            <div className={cx(itemDetailsContentClassname, styles.content)}>
              <ItemDetailsContentComponent item={item} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ItemDetailsPanel.propTypes = {};

export default ItemDetailsPanel;
