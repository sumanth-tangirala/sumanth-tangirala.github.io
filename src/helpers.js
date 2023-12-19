import htmlParse from "html-react-parser";

import _replace from 'lodash/replace';
import _includes from "lodash/includes";

export const parse = (text) => {
    text = _replace(text, '<yellow_bold>', '<span style=\"color:#fcc923;font-weight: 500;\">');
    text = _replace(text, '</yellow_bold>', '</span>');
    return htmlParse(text);
}