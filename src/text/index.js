import rawText from './text.json';

const mediaURL = 'https://raw.githubusercontent.com/sumanth-tangirala/personal-webpage/main/media/';
const docsURL = 'https://nbviewer.org/github/sumanth-tangirala/personal-webpage/blob/main/media/'

const updatedText = JSON.stringify(rawText)
    .replaceAll("%MEDIA_URL%", mediaURL)
    .replaceAll("%DOCS_URL%/", docsURL);


export default JSON.parse(updatedText);
