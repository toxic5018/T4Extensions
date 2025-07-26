// Image Converter Extension
// Made by Toxic5018
// Follow my website: https://toxic5018.github.io/toxic5018.me/

(async function (Scratch) {
    if (!Scratch.extensions.unsandboxed) {
        alert("This extension needs to be unsandboxed for Image Converter functionality!");
        return;
    }

    // --- Extension Configuration ---
    const mainColor = "#9966ff"; // Purple
    const blockIcon = "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/block14.png?raw=true";
    const menuIcon = "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/extensions/logo/imageconverter_extension_logo.png?raw=true";

    // --- Internal State & Utilities ---
    let _currentImage = null;
    let _currentImageCanvas = null;
    let _currentImageCtx = null;
    let _isImageLoaded = false;
    let _lastOperationStatus = "idle"; 
    let _lastErrorMessage = "";

    let _currentFilters = {
        brightness: 100,
        saturation: 100,
        grayscale: false,
        invert: false,
        sepia: false,
        hueRotate: 0,
        blur: 0,
        contrast: 100,
        dropShadow: ""
    };

    const fireEvent = (eventName, detail = {}) => {
        Scratch.vm.runtime.emit(eventName, detail);
    };

    function resetImageState() {
        _currentImage = null;
        _isImageLoaded = false;
        if (_currentImageCanvas) {
            _currentImageCanvas.width = 1;
            _currentImageCanvas.height = 1;
        }
        _lastOperationStatus = "idle";
        _lastErrorMessage = "";
        _currentFilters = {
            brightness: 100,
            saturation: 100,
            grayscale: false,
            invert: false,
            sepia: false,
            hueRotate: 0,
            blur: 0,
            contrast: 100,
            dropShadow: ""
        };
    }

    function setupCanvas(width, height) {
        if (!_currentImageCanvas) {
            _currentImageCanvas = document.createElement('canvas');
            _currentImageCtx = _currentImageCanvas.getContext('2d', { willReadFrequently: true });
        }
        _currentImageCanvas.width = width;
        _currentImageCanvas.height = height;
        _currentImageCtx.clearRect(0, 0, width, height);
    }

    function applyAllCurrentFilters() {
        let f = '';
        if (_currentFilters.brightness !== 100) f += `brightness(${_currentFilters.brightness}%) `;
        if (_currentFilters.saturation !== 100) f += `saturate(${_currentFilters.saturation}%) `;
        if (_currentFilters.grayscale) f += `grayscale(100%) `;
        if (_currentFilters.invert) f += `invert(100%) `;
        if (_currentFilters.sepia) f += `sepia(100%) `;
        if (_currentFilters.hueRotate) f += `hue-rotate(${_currentFilters.hueRotate}deg) `;
        if (_currentFilters.blur) f += `blur(${_currentFilters.blur}px) `;
        if (_currentFilters.contrast !== 100) f += `contrast(${_currentFilters.contrast}%) `;
        if (_currentFilters.dropShadow) f += _currentFilters.dropShadow + ' ';
        _currentImageCtx.filter = f.trim();
    }

    function redrawImageWithFilters() {
        if (!_currentImage || !_currentImageCtx || !_isImageLoaded) return;
        const w = _currentImageCanvas.width, h = _currentImageCanvas.height;
        setupCanvas(w, h);
        applyAllCurrentFilters();
        _currentImageCtx.drawImage(_currentImage, 0, 0, w, h);
    }

    function loadImage(source, isBase64) {
        return new Promise((resolve, reject) => {
            resetImageState();
            _lastOperationStatus = "loading";
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                _currentImage = img;
                setupCanvas(img.naturalWidth, img.naturalHeight);
                _currentImageCtx.drawImage(img, 0, 0);
                _isImageLoaded = true;
                _lastOperationStatus = "success";
                fireEvent('IMAGE_LOADED');
                resolve();
            };
            img.onerror = e => {
                _lastOperationStatus = "error";
                _lastErrorMessage = `Failed to load image: ${e.message || 'Unknown error'}.`;
                fireEvent('IMAGE_LOAD_FAILED');
                reject(new Error(_lastErrorMessage));
            };
            img.src = source;
        });
    }

    function convertCurrentCanvasToFormat(format, quality=0.92) {
        if (!_currentImageCanvas || !_isImageLoaded) {
            _lastOperationStatus = "error";
            _lastErrorMessage = "No image loaded to convert.";
            return "";
        }
        try {
            _lastOperationStatus = "processing";
            const dataURL = _currentImageCanvas.toDataURL(format, quality);
            _lastOperationStatus = "success";
            return dataURL;
        } catch (e) {
            _lastOperationStatus = "error";
            _lastErrorMessage = `Conversion failed: ${e.message}`;
            return "";
        }
    }

    function gcd(a, b) {
        return b === 0 ? a : gcd(b, a % b);
    }

    // --- Extension Definition ---
    class ImageConverterExtension {
        constructor() { setupCanvas(1, 1); }

        getInfo() {
            return {
                id: 'imageconverter',
                name: 'Image Converter',
                menuIconURI: menuIcon,
                color1: mainColor,
                blocks: [
                    { blockType: Scratch.BlockType.LABEL, text: '- Image Loading -' },
                    {
                        opcode: 'loadImageFromURL',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'load image from URL [URL]',
                        arguments: { URL: { type: Scratch.ArgumentType.STRING, defaultValue: 'https://extensions.turbowarp.org/dango.png' } },
                        func: 'loadImageFromURL',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'loadImageFromBase64',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'load image from Base64 [BASE64]',
                        arguments: { BASE64: { type: Scratch.ArgumentType.STRING, defaultValue: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' } },
                        func: 'loadImageFromBase64',
                        blockIconURI: blockIcon
                    },
                    { opcode: 'whenImageLoaded', blockType: Scratch.BlockType.HAT, text: 'when image loaded', blockIconURI: blockIcon },
                    { opcode: 'whenImageLoadFailed', blockType: Scratch.BlockType.HAT, text: 'when image load failed', blockIconURI: blockIcon },
                    { opcode: 'isImageLoaded', blockType: Scratch.BlockType.BOOLEAN, text: 'is image loaded?', blockIconURI: blockIcon },

                    { blockType: Scratch.BlockType.LABEL, text: '- Image Conversion & Manipulation -' },
                    {
                        opcode: 'convertImageFormat',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'convert image to [FORMAT] quality [QUALITY]%',
                        blockShape: Scratch.BlockShape.SQUARE,
                        blockIconURI: blockIcon,
                        arguments: {
                            FORMAT: { type: Scratch.ArgumentType.STRING, menu: 'imageFormatMenu', defaultValue: 'png' },
                            QUALITY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 }
                        }
                    },
                    {
                        opcode: 'convertImageURLToFormat',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'convert image from URL [URL] to [FORMAT] quality [QUALITY]%',
                        blockShape: Scratch.BlockShape.SQUARE,
                        blockIconURI: blockIcon,
                        arguments: {
                            URL: { type: Scratch.ArgumentType.STRING, defaultValue: 'https://extensions.turbowarp.org/dango.png' },
                            FORMAT: { type: Scratch.ArgumentType.STRING, menu: 'imageFormatMenu', defaultValue: 'png' },
                            QUALITY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 }
                        }
                    },
                    {
                        opcode: 'resizeImage',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'resize image to width [WIDTH] height [HEIGHT]',
                        blockIconURI: blockIcon,
                        arguments: {
                            WIDTH: { type: Scratch.ArgumentType.NUMBER, defaultValue: 200 },
                            HEIGHT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 150 }
                        }
                    },
                    {
                        opcode: 'applyFilter',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'apply [FILTER_TYPE] filter',
                        arguments: { FILTER_TYPE: { type: Scratch.ArgumentType.STRING, menu: 'basicFilterMenu', defaultValue: 'grayscale' } },
                        func: 'applyBasicFilter',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'setSaturation',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set image saturation to [VALUE]%',
                        arguments: { VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 } },
                        func: 'setSaturation',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'setBrightness',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set image brightness to [VALUE]%',
                        arguments: { VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 } },
                        func: 'setBrightness',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'resetAllFilters',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'reset all image filters',
                        func: 'resetAllFilters',
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'getImageAsDataURL',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'image as data URL',
                        blockShape: Scratch.BlockShape.SQUARE,
                        blockIconURI: blockIcon
                    },
                    {
                        opcode: 'downloadImage',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'download image as [FORMAT] quality [QUALITY]% filename [FILENAME]',
                        blockIconURI: blockIcon,
                        arguments: {
                            FORMAT: { type: Scratch.ArgumentType.STRING, menu: 'imageFormatMenu', defaultValue: 'png' },
                            QUALITY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
                            FILENAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'my_image' }
                        }
                    },

                    { blockType: Scratch.BlockType.LABEL, text: '- Image Data & Pixels -' },
                    { opcode: 'getImageWidth', blockType: Scratch.BlockType.REPORTER, text: 'image width', blockShape: Scratch.BlockShape.SQUARE, blockIconURI: blockIcon },
                    { opcode: 'getImageHeight', blockType: Scratch.BlockType.REPORTER, text: 'image height', blockShape: Scratch.BlockShape.SQUARE, blockIconURI: blockIcon },
                    { opcode: 'getImageAspectRatio', blockType: Scratch.BlockType.REPORTER, text: 'image aspect ratio', blockShape: Scratch.BlockShape.SQUARE, blockIconURI: blockIcon },
                    {
                        opcode: 'getPixelColor',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'pixel [COMPONENT] at x [X] y [Y]',
                        blockShape: Scratch.BlockShape.SQUARE,
                        blockIconURI: blockIcon,
                        arguments: {
                            COMPONENT: { type: Scratch.ArgumentType.STRING, menu: 'colorComponentMenu', defaultValue: 'red' },
                            X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                        }
                    },
                    {
                        opcode: 'getAverageColor',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'average image [COMPONENT]',
                        blockShape: Scratch.BlockShape.SQUARE,
                        blockIconURI: blockIcon,
                        arguments: {
                            COMPONENT: { type: Scratch.ArgumentType.STRING, menu: 'colorComponentMenu', defaultValue: 'red' }
                        }
                    },

                    { blockType: Scratch.BlockType.LABEL, text: '- Image Status & Information -' },
                    { opcode: 'getImageMIMEType', blockType: Scratch.BlockType.REPORTER, text: 'image MIME type', blockIconURI: blockIcon },
                    { opcode: 'getLastImageError', blockType: Scratch.BlockType.REPORTER, text: 'last image error', blockIconURI: blockIcon },
                    { opcode: 'getImageOperationStatus', blockType: Scratch.BlockType.REPORTER, text: 'image operation status', blockIconURI: blockIcon }
                ],
                menus: {
                    imageFormatMenu: { acceptReporters: false, items: ['png','jpeg','webp'] },
                    basicFilterMenu: { acceptReporters: false, items: ['grayscale','invert','none'] },
                    colorComponentMenu: { acceptReporters: false, items: ['red','green','blue','alpha'] }
                }
            };
        }

        // --- Block Implementations ---

        async loadImageFromURL({URL}) {
            await loadImage(URL, false);
        }
        async loadImageFromBase64({BASE64}) {
            await loadImage(BASE64, true);
        }
        whenImageLoaded() {}
        whenImageLoadFailed() {}
        isImageLoaded() { return _isImageLoaded; }

        convertImageFormat({FORMAT, QUALITY}) {
            if (!_isImageLoaded) return "";
            const fmt = FORMAT.toLowerCase();
            let mime = fmt==='jpeg'?'image/jpeg':fmt==='webp'?'image/webp':'image/png';
            let q = Math.max(0,Math.min(100,Number(QUALITY)||100))/100;
            return convertCurrentCanvasToFormat(mime, q);
        }

        async convertImageURLToFormat({URL, FORMAT, QUALITY}) {
            _lastOperationStatus = "processing";
            _lastErrorMessage = "";
            try {
                const img = new Image();
                img.crossOrigin = "anonymous";
                await new Promise((res,rej)=>{ img.onload=res; img.onerror=rej; img.src=URL; });
                const c = document.createElement('canvas');
                const ctx = c.getContext('2d',{ willReadFrequently:true });
                c.width = img.naturalWidth; c.height = img.naturalHeight;
                ctx.drawImage(img,0,0);
                const fmt = FORMAT.toLowerCase();
                const mime = fmt==='jpeg'?'image/jpeg':fmt==='webp'?'image/webp':'image/png';
                const q = Math.max(0,Math.min(100,Number(QUALITY)||100))/100;
                _lastOperationStatus="success";
                return c.toDataURL(mime, q);
            } catch(e) {
                _lastOperationStatus="error";
                _lastErrorMessage = `Failed to convert image from URL: ${e.message}`;
                return "";
            }
        }

        resizeImage({WIDTH,HEIGHT}) {
            if (!_isImageLoaded) {
                _lastErrorMessage="No image loaded to resize.";
                _lastOperationStatus="error";
                return;
            }
            const w = Math.max(1,Number(WIDTH)||1);
            const h = Math.max(1,Number(HEIGHT)||1);
            _lastOperationStatus="processing";
            try { setupCanvas(w,h); redrawImageWithFilters(); _lastOperationStatus="success"; }
            catch(e){ _lastOperationStatus="error"; _lastErrorMessage=`Resize error: ${e.message}`; }
        }

        applyBasicFilter({FILTER_TYPE}) {
            if (!_isImageLoaded) { _lastErrorMessage="No image loaded."; _lastOperationStatus="error"; return; }
            const f = FILTER_TYPE.toLowerCase();
            _currentFilters.grayscale = (f==='grayscale');
            _currentFilters.invert = (f==='invert');
            if (f==='none') { _currentFilters.grayscale=false; _currentFilters.invert=false; }
            _lastOperationStatus="processing"; redrawImageWithFilters(); _lastOperationStatus="success";
        }

        setSaturation({VALUE}) {
            if (!_isImageLoaded) { _lastErrorMessage="No image loaded."; _lastOperationStatus="error"; return; }
            const v = Math.max(0, Math.min(1000, Number(VALUE)||100));
            _currentFilters.saturation = v;
            _lastOperationStatus="processing"; redrawImageWithFilters(); _lastOperationStatus="success";
        }

        setBrightness({VALUE}) {
            if (!_isImageLoaded) { _lastErrorMessage="No image loaded."; _lastOperationStatus="error"; return; }
            const v = Math.max(0, Math.min(1000, Number(VALUE)||100));
            _currentFilters.brightness = v;
            _lastOperationStatus="processing"; redrawImageWithFilters(); _lastOperationStatus="success";
        }

        resetAllFilters() {
            if (!_isImageLoaded) { _lastErrorMessage="No image loaded."; _lastOperationStatus="error"; return; }
            _currentFilters = {brightness:100,saturation:100,grayscale:false,invert:false,sepia:false,hueRotate:0,blur:0,contrast:100,dropShadow:""};
            _lastOperationStatus="processing"; redrawImageWithFilters(); _lastOperationStatus="success";
        }

        getImageAsDataURL() {
            if (!_isImageLoaded) return "";
            let mime = 'image/png';
            if (_currentImage.src.startsWith('data:')) {
                const m = _currentImage.src.match(/^data:([^;]+);/);
                if (m) mime = m[1];
            }
            return convertCurrentCanvasToFormat(mime);
        }

        downloadImage({FORMAT,QUALITY,FILENAME}) {
            if (!_isImageLoaded) { _lastErrorMessage="No image loaded."; _lastOperationStatus="error"; return; }
            const fmt = FORMAT.toLowerCase();
            const mime = fmt==='jpeg'?'image/jpeg':fmt==='webp'?'image/webp':'image/png';
            const ext = fmt==='jpeg'?'jpg':fmt;
            const q = Math.max(0,Math.min(100,Number(QUALITY)||100))/100;
            const dataURL = convertCurrentCanvasToFormat(mime,q);
            if (!dataURL) return;
            try {
                const a = document.createElement('a');
                a.href = dataURL;
                a.download = `${FILENAME || 'image'}.${ext}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                _lastOperationStatus="success";
            } catch(e) {
                _lastOperationStatus="error";
                _lastErrorMessage=`Download failed: ${e.message}`;
            }
        }

        getImageWidth() { return _currentImage ? _currentImage.naturalWidth : 0; }
        getImageHeight() { return _currentImage ? _currentImage.naturalHeight : 0; }

        getImageAspectRatio() {
            if (!_isImageLoaded) return "0:0";
            const w = _currentImage.naturalWidth, h = _currentImage.naturalHeight;
            if (!w||!h) return "0:0";
            const d = gcd(w,h);
            return `${w/d}:${h/d}`;
        }

        getPixelColor({COMPONENT,X,Y}) {
            if (!_isImageLoaded) { _lastErrorMessage="No image loaded."; _lastOperationStatus="error"; return 0; }
            const x = Math.floor(Number(X)||0), y = Math.floor(Number(Y)||0);
            if (x<0||x>=_currentImageCanvas.width||y<0||y>=_currentImageCanvas.height) {
                _lastErrorMessage="Coordinates out of bounds."; _lastOperationStatus="error"; return 0;
            }
            try {
                const d = _currentImageCtx.getImageData(x,y,1,1).data;
                switch (COMPONENT.toLowerCase()) {
                    case 'red': return d[0];
                    case 'green': return d[1];
                    case 'blue': return d[2];
                    case 'alpha': return d[3];
                    default: return 0;
                }
            } catch(e) {
                _lastOperationStatus="error";
                _lastErrorMessage=`Get pixel failed: ${e.message}`;
                return 0;
            }
        }

        getAverageColor({COMPONENT}) {
            if (!_isImageLoaded) { _lastErrorMessage="No image loaded."; _lastOperationStatus="error"; return 0; }
            try {
                const data = _currentImageCtx.getImageData(0,0,_currentImageCanvas.width,_currentImageCanvas.height).data;
                let sum=0, cnt=0;
                for (let i=0; i<data.length; i+=4) {
                    if (COMPONENT==='alpha' || data[i+3]>0) {
                        switch(COMPONENT.toLowerCase()){
                            case 'red': sum+=data[i]; break;
                            case 'green': sum+=data[i+1]; break;
                            case 'blue': sum+=data[i+2]; break;
                            case 'alpha': sum+=data[i+3]; break;
                        }
                        cnt++;
                    }
                }
                return cnt?Math.round(sum/cnt):0;
            } catch(e) {
                _lastOperationStatus="error";
                _lastErrorMessage=`Average failed: ${e.message}`;
                return 0;
            }
        }

        getImageMIMEType() {
            if (!_isImageLoaded) return "";
            if (_currentImage.src.startsWith('data:')) {
                const m = _currentImage.src.match(/^data:([^;]+);/);
                if (m) return m[1];
            }
            return 'image/png';
        }
        getLastImageError() { return _lastErrorMessage; }
        getImageOperationStatus() { return _lastOperationStatus; }
    }

    Scratch.extensions.register(new ImageConverterExtension());
})(Scratch);
