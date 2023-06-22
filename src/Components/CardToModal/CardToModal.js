import React, {useState} from 'react';
import {Modal} from 'antd'

import styles from './CardToModal.module.scss';


function CardToModal({title, shortDesc, longDesc, imgPath}) {
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
             <div className={styles.cardInfo}>
                 <div className={styles.title}>{title}</div>
                 <div className={styles.description}>{shortDesc}</div>
                 {renderModal()}
             </div>
         </div>
    );
}

CardToModal.propTypes = {};

export default CardToModal;