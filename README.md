# SOAP: Webtoon Translator

SOAP is a Chrome extension that translates Korean webtoons (manhwa) into English directly on the page. It finds the comic panels on a page, reads the Korean text in each one with OCR, translates it, and places the English text over the original speech bubbles. Hovering over a translation hides it so you can see the original Korean underneath.

## How it works

1. **Panel detection (`content.js`).** When a page loads, the content script collects every image larger than 500 × 700 pixels, which filters out icons and ads and keeps the comic panels.
2. **OCR (`background.js`).** The service worker processes the panels one at a time. Each image is converted to base64 and sent to the Google Cloud Vision API for text detection. The response is grouped into text blocks, and the bounding box of each block and each word is kept.
3. **Translation.** Each block of Korean text is sent to the Google Cloud Translation API (Korean to English).
4. **Overlay (`content.js`).** For each translation, the content script scales the bounding boxes from the image's natural size to its displayed size, covers the original words with white boxes, and places the English text in a centered overlay sized to the original block. Text is wrapped to fit the width of the box.

The service worker also includes a small mapping of common Korean sound effects (for example, 쾅 to BANG and 쿵 to THUD).

## Built with

- JavaScript, Chrome Extensions API (Manifest V3)
- Google Cloud Vision API (text detection)
- Google Cloud Translation API

## Setup

1. Clone this repository.
2. In the [Google Cloud Console](https://console.cloud.google.com/), enable the **Cloud Vision API** and the **Cloud Translation API**, then create an API key. Restricting the key to those two APIs is recommended.
3. Copy `config.example.js` to a new file named `config.js` and paste your key into it. `config.js` is ignored by git, so the key stays on your machine.
4. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and select this folder.
5. Open a webtoon page. Translations appear over the panels as each one finishes processing.

### Font (optional)

The overlay is styled to use the comic lettering font CC Wild Words. That font is commercially licensed, so it is not included in this repository. If you have a license, place `CCWildWords.ttf` in the root of the folder. Without it, the extension falls back to the browser's default cursive font and works normally.

## Limitations

- Translation is block by block, so it has no context from earlier panels.
- The white cover boxes are rectangles, so they do not match curved speech bubbles exactly.
