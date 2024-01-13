import htmlParse from "html-react-parser";

import _replace from 'lodash/replace';

export const parse = (text) => {
    text = _replace(text, '<yellow_bold>', '<span style="color:#fcc923;font-weight: 500;">');
    text = _replace(text, '</yellow_bold>', '</span>');
    return htmlParse(text);
}

export const mobileDesktopSwitcher = ({mobile, desktop}) => {
    return window.innerWidth < 750 ? mobile : desktop;
}