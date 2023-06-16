import React, {useState} from 'react';
import {Modal} from 'antd'
import text from 'text/text.json';

import styles from './CardToModal.module.scss';


function CardToPopover({title, shortDesc, longDesc, imgPath}) {
    const images = text.historyBannerImages;

    const [isModalOpen, setIsModalOpen] = useState(false);

    const toggleModal = () => {
        setIsModalOpen(!isModalOpen);
    }

    const renderModal = () => (
        <Modal open={isModalOpen} onCancel={toggleModal} footer={null} title={title}>
            {longDesc}
        </Modal>
    )

    return (
         <div
             className={styles.container}
             style={{backgroundImage: `url(${imgPath})`}}
             onClick={toggleModal}
         >
             <div className={styles.title}>{title}</div>
             <div className={styles.description}>{shortDesc}</div>
             {renderModal()}
         </div>
    );
}

CardToPopover.propTypes = {};

export default CardToPopover;