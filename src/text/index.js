import rawText from './text.json';

const mediaURL = 'https://raw.githubusercontent.com/sumanth-tangirala/personal-webpage/main/media';
const docsURL = `https://docs.google.com/viewer?url=${mediaURL}`;

const updatedText = JSON.stringify(rawText)
    .replaceAll("%MEDIA_URL%", mediaURL)
    .replaceAll("%DOCS_URL%", docsURL);

console.log()


export default JSON.parse(updatedText);
