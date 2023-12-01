import rawText from './text.json';

const mediaURL = 'https://raw.githubusercontent.com/sumanth-tangirala/personal-webpage/main/media/';

const updatedText = JSON.stringify(rawText).replaceAll("%MEDIA_URL%", mediaURL);

export default JSON.parse(updatedText);
