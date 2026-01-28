## Icon conversion notes

- Source: icon.svg (checked, contains pie chart with 3 segments and center circle)
- Tool used: pureimage (npm package) via scripts/generate_icon.js
- Command: `node scripts/generate_icon.js`
- Output: icon.png (128x128 PNG, transparent background)
- Verification:
  - `file icon.png` -> "PNG image data, 128 x 128, 8-bit/color RGBA"
  - Node check: file size 4512 bytes, PNG signature 89504e470d0a1a0a

Notes:
- Ensured flat colors, 3px stroke, transparent background.
- Did not modify icon.svg.
