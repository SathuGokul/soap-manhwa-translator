console.log('Retriveing panels...');


const ccFont = new FontFace('CCWildWords', 'url(' + chrome.runtime.getURL('CCWildWords.ttf') + ')');


ccFont.load().then(function(font) {
   document.fonts.add(font);
   console.log('SOAP font loaded: ' + font.family);
}).catch(function(err) {
   console.log('SOAP font error: ' + err);
});


function getImages() {
   const allImgs = document.querySelectorAll('img');
   const panelImgs = [];


   for (let i = 0; i < allImgs.length; i++) {
       const img = allImgs[i];
       if (img.naturalWidth > 500 && img.naturalHeight > 700) {
           const imgData = {
               index: i,
               src: img.src,
               width: img.naturalWidth,
               height: img.naturalHeight
           };
           panelImgs.push(imgData);
       }
   }
   return panelImgs;
}


function decodeHTML(text) {
   const txt = document.createElement('textarea');
   txt.innerHTML = text;
   return txt.value;
}


function formatTextForBox(text, boxWidth, fontSize) {
   const words = text.split(' ');
   const charsPerLine = Math.floor(boxWidth / (fontSize * 0.6));
   const lines = [];
   let currentLine = '';


   for (let i = 0; i < words.length; i++) {
       let testLine;
       if (currentLine !== '') {
           testLine = currentLine + ' ' + words[i];
       } else {
           testLine = words[i];
       }


       if (testLine.length > charsPerLine && currentLine !== '') {
           lines.push(currentLine);
           currentLine = words[i];
       } else {
           currentLine = testLine;
       }
   }


   if (currentLine !== '') {
       lines.push(currentLine);
   }


   return lines.join('\n');
}


const gotImgs = getImages();
console.log('SOAP found ' + gotImgs.length + ' panel-sized images on this page');
console.log(gotImgs);


chrome.runtime.sendMessage({
   type: 'IMAGES_FOUND',
   payload: gotImgs
});


chrome.runtime.onMessage.addListener(function(message) {
   if (message.type === 'TRANSLATION_DONE') {
       const allImgs = document.querySelectorAll('img');


       for (let i = 0; i < allImgs.length; i++) {
           if (allImgs[i].src === message.imgSrc) {
               const img = allImgs[i];


               const scaleX = img.width / img.naturalWidth;
               const scaleY = img.height / img.naturalHeight;


               const parent = img.parentElement;
               parent.style.position = 'relative';


               const verts = message.boundingBox;
               const boxLeft = verts[0].x * scaleX;
               const boxTop = verts[0].y * scaleY;
               const boxWidth = (verts[1].x - verts[0].x) * scaleX;
               const boxHeight = (verts[2].y - verts[0].y) * scaleY;


               const whiteouts = [];
               for (let w = 0; w < message.wordBoxes.length; w++) {
                   const wv = message.wordBoxes[w];
                   const wLeft = wv[0].x * scaleX;
                   const wTop = wv[0].y * scaleY;
                   const wWidth = (wv[1].x - wv[0].x) * scaleX;
                   const wHeight = (wv[2].y - wv[0].y) * scaleY;


                   const whiteout = document.createElement('div');
                   whiteout.style.position = 'absolute';
                   whiteout.style.left = (img.offsetLeft + wLeft - 2) + 'px';
                   whiteout.style.top = (img.offsetTop + wTop - 2) + 'px';
                   whiteout.style.width = (wWidth + 4) + 'px';
                   whiteout.style.height = (wHeight + 4) + 'px';
                   whiteout.style.background = 'white';
                   whiteout.style.zIndex = '9998';
                   whiteout.style.opacity = '1';
                   whiteout.style.transition = 'opacity 0.2s ease';
                   whiteout.style.pointerEvents = 'none';
                   parent.appendChild(whiteout);
                   whiteouts.push(whiteout);
               }


               const overlay = document.createElement('div');
               overlay.style.position = 'absolute';
               overlay.style.left = (img.offsetLeft + boxLeft) + 'px';
               overlay.style.top = (img.offsetTop + boxTop) + 'px';
               overlay.style.width = boxWidth + 'px';
               overlay.style.minHeight = boxHeight + 'px';
               overlay.style.background = 'none';
               overlay.style.color = 'black';
               overlay.style.fontSize = '16px';
               overlay.style.fontFamily = "'CCWildWords', cursive";
               overlay.style.fontWeight = 'bold';
               overlay.style.letterSpacing = '0px';
               overlay.style.zIndex = '9999';
               overlay.style.whiteSpace = 'pre-wrap';
               overlay.style.textAlign = 'center';
               overlay.style.cursor = 'pointer';
               overlay.style.transition = 'opacity 0.2s ease';
               overlay.style.lineHeight = '1.3';
               overlay.style.display = 'flex';
               overlay.style.alignItems = 'center';
               overlay.style.justifyContent = 'center';
               overlay.style.opacity = '1';
               overlay.innerText = formatTextForBox(decodeHTML(message.translation), boxWidth, 16);


               overlay.addEventListener('mouseenter', function() {
               overlay.style.opacity = '0';
               for (let w = 0; w < whiteouts.length; w++) {
                   whiteouts[w].style.opacity = '0';
               }
           });


           overlay.addEventListener('mouseleave', function() {
               overlay.style.opacity = '1';
               for (let w = 0; w < whiteouts.length; w++) {
                   whiteouts[w].style.opacity = '1';
               }
           });


               parent.appendChild(overlay);
           }
       }
   }
});

