// The API key lives in config.js, which is not committed. See README.md.
importScripts('config.js');
const VISION_KEY = self.GOOGLE_API_KEY;


chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
   if (message.type === 'IMAGES_FOUND') {
       console.log('SOAP background received images from: ' + sender.tab.url);
       console.log('SOAP number of images to process: ' + message.payload.length);
       processNext(message.payload, 0, sender.tab.id);
   }
});


function processNext(images, index, tabId) {
   if (index >= images.length) {
       console.log('SOAP done processing all panels');
       return;
   }
   console.log('SOAP processing image ' + index + ' of ' + images.length);
   callVision(images[index].src, tabId, function() {
       processNext(images, index + 1, tabId);
   });
}


function callVision(imgUrl, tabId, done) {
   fetch(imgUrl)
       .then(function(res) { return res.blob(); })
       .then(function(blob) {
           const reader = new FileReader();
           reader.onloadend = function() {
               const base64 = reader.result.split(',')[1];
               sendToVision(base64, imgUrl, tabId, done);
           };
           reader.readAsDataURL(blob);
       });
}

function isSoundEffect(text) {
    const trimmed = text.trim();
    if (trimmed.length > 8) return false;
    if (trimmed.includes(' ')) return false;
    if (/^[가-힣]{1,4}$/.test(trimmed)) return true;
    return false;
}

function romanizeSFX(text) {
    const sfxMap = {
        '퍽': 'THWACK', '쾅': 'BANG', '쿵': 'THUD', '휙': 'WHOOSH',
        '탁': 'SMACK', '척': 'SNAP', '윽': 'UGH', '헉': 'GASP',
        '아': 'AH', '어': 'UH', '으': 'UGH', '흠': 'HMM',
        '하': 'HA', '호': 'HO', '히': 'HEE', '후': 'HUH',
        '끄': 'GRR', '끙': 'NGH', '크': 'KH', '흑': 'SOB'
    };
    return sfxMap[text.trim()] || null;
}


function sendToVision(base64, imgUrl, tabId, done) {
   const url = 'https://vision.googleapis.com/v1/images:annotate?key=' + VISION_KEY;
   const body = {
       requests: [{
           image: { content: base64 },
           features: [{ type: 'TEXT_DETECTION' }]
       }]
   };
   fetch(url, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(body)
   })
       .then(function(res) { return res.json(); })
       .then(function(data) {
           const response = data.responses[0];
           if (!response.fullTextAnnotation) {
               console.log('SOAP no text found, skipping');
               done();
               return;
           }


           const blocks = response.fullTextAnnotation.pages[0].blocks;


           for (let b = 0; b < blocks.length; b++) {
               const block = blocks[b];
               let blockText = '';
               const wordBoxes = [];


               for (let p = 0; p < block.paragraphs.length; p++) {
                   const para = block.paragraphs[p];
                   for (let w = 0; w < para.words.length; w++) {
                       const word = para.words[w];
                       wordBoxes.push(para.words[w].boundingBox.vertices);
                       for (let s = 0; s < word.symbols.length; s++) {
                           blockText += word.symbols[s].text;
                       }
                       blockText += ' ';
                   }
                   blockText += '\n';
               }


               blockText = blockText.trim();
               const boundingBox = block.boundingBox.vertices;
               const isLast = b === blocks.length - 1;
              if (isLast) {
                    callTranslate(blockText, imgUrl, tabId, boundingBox, wordBoxes, done);
                } else {
                    callTranslate(blockText, imgUrl, tabId, boundingBox, wordBoxes, function() {});
                }
           }
       });
}


function callTranslate(koreanText, imgSrc, tabId, boundingBox, wordBoxes, done) {
   const url = 'https://translation.googleapis.com/language/translate/v2?key=' + VISION_KEY;


   fetch(url, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ q: koreanText, target: 'en', source: 'ko' })
   })
       .then(function(res) { return res.json(); })
       .then(function(data) {
           const english = data.data.translations[0].translatedText;
           console.log('SOAP translation: ' + english);
           chrome.tabs.sendMessage(tabId, {
               type: 'TRANSLATION_DONE',
               translation: english,
               original: koreanText,
               imgSrc: imgSrc,
               boundingBox: boundingBox,
               wordBoxes: wordBoxes
           });
           done();
       });
}

