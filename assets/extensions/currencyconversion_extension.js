// currency_conversion_extension
// Made by Toxic5018
// Follow my website: https://toxic5018.github.io/toxic5018.me/

(async function (Scratch) {
    if (!Scratch.extensions.unsandboxed) {
        alert("This extension needs to be unsandboxed for full Currency Conversion functionality!");
        return;
    }

    // --- Extension Configuration ---
    const EXTENSION_COLOR = '#7bdd1a'; // Green
    const BLOCK_ICON_URI = "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/block3.png?raw=true";
    const MENU_ICON_URI = "https://github.com/toxic5018/T4Extensions/blob/main/assets/textures/extensions/logo/currencyconversion_extension_logo.png?raw=true";

    // --- Internal State & Utilities ---
    let _lastConversionError = "";
    let _lastConversionStatus = "";

    // Hypothetical exchange rates for demonstration purposes.
    // In a real application, these would be fetched from an external API.
    const HYPOTHETICAL_EXCHANGE_RATES = {
        "USD": { "EUR": 0.93, "GBP": 0.79, "JPY": 158.00, "CAD": 1.37, "AUD": 1.51, "INR": 83.50, "BRL": 5.40, "CNY": 7.26, "SGD": 1.35, "NZD": 1.63, "CHF": 0.89 },
        "EUR": { "USD": 1.08, "GBP": 0.85, "JPY": 170.00, "CAD": 1.48, "AUD": 1.63, "INR": 90.00, "BRL": 5.82, "CNY": 7.84, "SGD": 1.46, "NZD": 1.76, "CHF": 0.96 },
        "GBP": { "USD": 1.27, "EUR": 1.18, "JPY": 200.00, "CAD": 1.74, "AUD": 1.92, "INR": 105.00, "BRL": 6.85, "CNY": 9.20, "SGD": 1.72, "NZD": 2.06, "CHF": 1.13 },
        "JPY": { "USD": 0.0063, "EUR": 0.0059, "GBP": 0.0050, "CAD": 0.0087, "AUD": 0.0095, "INR": 0.53, "BRL": 0.034, "CNY": 0.046, "SGD": 0.0085, "NZD": 0.010, "CHF": 0.0056 },
        "CAD": { "USD": 0.73, "EUR": 0.68, "GBP": 0.57, "JPY": 115.00, "AUD": 1.10, "INR": 61.00, "BRL": 3.95, "CNY": 5.30, "SGD": 0.98, "NZD": 1.19, "CHF": 0.65 },
        "AUD": { "USD": 0.66, "EUR": 0.61, "GBP": 0.52, "JPY": 105.00, "CAD": 0.91, "INR": 55.00, "BRL": 3.55, "CNY": 4.75, "SGD": 0.89, "NZD": 1.08, "CHF": 0.59 },
        "INR": { "USD": 0.012, "EUR": 0.011, "GBP": 0.0095, "JPY": 1.88, "CAD": 0.016, "AUD": 0.018, "BRL": 0.065, "CNY": 0.087, "SGD": 0.016, "NZD": 0.019, "CHF": 0.011 },
        "BRL": { "USD": 0.18, "EUR": 0.17, "GBP": 0.15, "JPY": 29.00, "CAD": 0.25, "AUD": 0.28, "INR": 15.30, "CNY": 1.34, "SGD": 0.25, "NZD": 0.30, "CHF": 0.16 },
        "CNY": { "USD": 0.14, "EUR": 0.13, "GBP": 0.11, "JPY": 21.70, "CAD": 0.19, "AUD": 0.21, "INR": 11.50, "BRL": 0.74, "SGD": 0.18, "NZD": 0.23, "CHF": 0.12 },
        "SGD": { "USD": 0.74, "EUR": 0.68, "GBP": 0.58, "JPY": 118.00, "CAD": 1.02, "AUD": 1.12, "INR": 62.00, "BRL": 4.00, "CNY": 5.50, "NZD": 1.20, "CHF": 0.66 },
        "NZD": { "USD": 0.61, "EUR": 0.57, "GBP": 0.48, "JPY": 97.00, "CAD": 0.84, "AUD": 0.92, "INR": 51.00, "BRL": 3.30, "CNY": 4.50, "SGD": 0.83, "CHF": 0.54 },
        "CHF": { "USD": 1.12, "EUR": 1.04, "GBP": 0.88, "JPY": 178.00, "CAD": 1.53, "AUD": 1.68, "INR": 93.00, "BRL": 6.00, "CNY": 8.10, "SGD": 1.50, "NZD": 1.85 }
    };

    const SUPPORTED_CURRENCIES = Object.keys(HYPOTHETICAL_EXCHANGE_RATES);

    // https://en.wikipedia.org/wiki/Names_of_large_numbers
    // Abbreviations for large numbers up to Vigintillion (10^63)
    const ABBREVIATION_SUFFIXES = [
        { value: 1e63, symbol: "Vg" }, // Vigintillion
        { value: 1e60, symbol: "Nv" }, // Novemdecillion
        { value: 1e57, symbol: "Oc" }, // Octodecillion
        { value: 1e54, symbol: "Sp" }, // Septendecillion
        { value: 1e51, symbol: "Sx" }, // Sexdecillion
        { value: 1e48, symbol: "Qn" }, // Quindecillion
        { value: 1e45, symbol: "Qd" }, // Quattuordecillion
        { value: 1e42, symbol: "Td" }, // Tredecillion
        { value: 1e39, symbol: "Dd" }, // Duodecillion
        { value: 1e36, symbol: "U" },  // Undecillion
        { value: 1e33, symbol: "D" },  // Decillion
        { value: 1e30, symbol: "N" },  // Nonillion
        { value: 1e27, symbol: "O" },  // Octillion
        { value: 1e24, symbol: "S" },  // Septillion
        { value: 1e21, symbol: "s" },  // Sextillion (using 's' to distinguish from Septillion 'S')
        { value: 1e18, symbol: "Q" },  // Quintillion
        { value: 1e15, symbol: "q" },  // Quadrillion (using 'q' to distinguish from Quintillion 'Q')
        { value: 1e12, symbol: "T" },  // Trillion
        { value: 1e9,  symbol: "B" },  // Billion
        { value: 1e6,  symbol: "M" },  // Million
        { value: 1e3,  symbol: "K" }   // Thousand
    ];


    // --- Utility Functions ---

    function formatNumberForLocale(number, locale = 'en-US', minFractionDigits = 2, maxFractionDigits = 2) {
        try {
            return new Intl.NumberFormat(locale, {
                minimumFractionDigits: minFractionDigits,
                maximumFractionDigits: maxFractionDigits
            }).format(number);
        } catch (e) {
            _lastConversionError = `Formatting Error: ${e.message}`;
            _lastConversionStatus = "Failed to format number.";
            return String(number);
        }
    }

    function formatCurrencyForLocale(amount, currencyCode, locale = 'en-US') {
        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: currencyCode,
            }).format(amount);
        } catch (e) {
            _lastConversionError = `Currency Formatting Error: ${e.message}`;
            _lastConversionStatus = "Failed to format currency.";
            return `${String(amount)} ${currencyCode}`;
        }
    }

    function convertCurrency(args) {
        const amount = Number(args.AMOUNT);
        const fromCurrency = String(args.FROM_CURRENCY).toUpperCase();
        const toCurrency = String(args.TO_CURRENCY).toUpperCase();

        if (isNaN(amount)) {
            _lastConversionError = "Invalid amount provided.";
            _lastConversionStatus = "Conversion failed.";
            return 0;
        }

        if (!SUPPORTED_CURRENCIES.includes(fromCurrency)) {
            _lastConversionError = `Unsupported 'From' currency: ${fromCurrency}`;
            _lastConversionStatus = "Conversion failed.";
            return 0;
        }

        if (!SUPPORTED_CURRENCIES.includes(toCurrency)) {
            _lastConversionError = `Unsupported 'To' currency: ${toCurrency}`;
            _lastConversionStatus = "Conversion failed.";
            return 0;
        }

        if (fromCurrency === toCurrency) {
            _lastConversionStatus = "Currencies are the same, no conversion needed.";
            return amount;
        }

        const fromRates = HYPOTHETICAL_EXCHANGE_RATES[fromCurrency];
        if (fromRates && fromRates[toCurrency]) {
            const convertedAmount = amount * fromRates[toCurrency];
            _lastConversionError = "";
            _lastConversionStatus = "Currency converted successfully.";
            return convertedAmount;
        } else {
            // Attempt inverse conversion if direct rate is missing
            const toRates = HYPOTHETICAL_EXCHANGE_RATES[toCurrency];
            if (toRates && toRates[fromCurrency]) {
                const convertedAmount = amount / toRates[fromCurrency];
                _lastConversionError = "";
                _lastConversionStatus = "Currency converted successfully (inverse rate used).";
                return convertedAmount;
            } else {
                _lastConversionError = `No exchange rate found from ${fromCurrency} to ${toCurrency}.`;
                _lastConversionStatus = "Conversion failed.";
                return 0;
            }
        }
    }

    function formatNumberAbbreviated(args) {
        const number = Number(args.NUMBER);
        const decimalPlaces = Math.max(0, Math.min(20, Number(args.DECIMAL_PLACES) || 0)); // Limit decimal places

        if (isNaN(number)) {
            _lastConversionError = "Invalid number for abbreviation.";
            _lastConversionStatus = "Abbreviation failed.";
            return String(args.NUMBER);
        }

        const absNumber = Math.abs(number);

        // Handle numbers smaller than 1000 without abbreviation
        if (absNumber < 1000) {
            _lastConversionError = "";
            _lastConversionStatus = "Number formatted without abbreviation.";
            return number.toFixed(decimalPlaces);
        }

        for (let i = 0; i < ABBREVIATION_SUFFIXES.length; i++) {
            const { value, symbol } = ABBREVIATION_SUFFIXES[i];
            if (absNumber >= value) {
                _lastConversionError = "";
                _lastConversionStatus = "Number abbreviated.";
                return (number / value).toFixed(decimalPlaces) + symbol;
            }
        }

        // Fallback for very large numbers beyond defined suffixes (shouldn't happen with Vigintillion)
        _lastConversionError = "Number too large to abbreviate with defined suffixes.";
        _lastConversionStatus = "Abbreviation failed.";
        return number.toPrecision(decimalPlaces + 3); // Fallback to scientific notation
    }

    function getCurrencySymbol(args) {
        const currencyCode = String(args.CURRENCY_CODE).toUpperCase();
        try {
            const formatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currencyCode,
                minimumFractionDigits: 0, // No decimals for symbol
                maximumFractionDigits: 0, // No decimals for symbol
            });
            // Get parts to extract the symbol
            const parts = formatter.formatToParts(0); // Use 0 to get symbol without amount
            const symbolPart = parts.find(part => part.type === 'currency');
            if (symbolPart) {
                _lastConversionError = "";
                _lastConversionStatus = "Currency symbol retrieved.";
                return symbolPart.value;
            }
            throw new Error("Symbol not found for currency code.");
        } catch (e) {
            _lastConversionError = `Error getting symbol for ${currencyCode}: ${e.message}`;
            _lastConversionStatus = "Failed to get currency symbol.";
            return "";
        }
    }

    function isValidCurrencyCode(args) {
        const currencyCode = String(args.CURRENCY_CODE).toUpperCase();
        return SUPPORTED_CURRENCIES.includes(currencyCode);
    }

    function isCurrencyConvertible(args) {
        const fromCurrency = String(args.FROM_CURRENCY).toUpperCase();
        const toCurrency = String(args.TO_CURRENCY).toUpperCase();

        if (!SUPPORTED_CURRENCIES.includes(fromCurrency) || !SUPPORTED_CURRENCIES.includes(toCurrency)) {
            return false;
        }

        if (fromCurrency === toCurrency) return true;

        const fromRates = HYPOTHETICAL_EXCHANGE_RATES[fromCurrency];
        const toRates = HYPOTHETICAL_EXCHANGE_RATES[toCurrency];

        return (fromRates && fromRates[toCurrency]) || (toRates && toRates[fromCurrency]);
    }

    function getAvailableCurrencies() {
        return JSON.stringify(SUPPORTED_CURRENCIES);
    }

    function getLastConversionError() {
        return _lastConversionError;
    }

    function getLastConversionStatus() {
        return _lastConversionStatus;
    }

    function getHypotheticalExchangeRate(args) {
        const fromCurrency = String(args.FROM_CURRENCY).toUpperCase();
        const toCurrency = String(args.TO_CURRENCY).toUpperCase();

        if (!SUPPORTED_CURRENCIES.includes(fromCurrency) || !SUPPORTED_CURRENCIES.includes(toCurrency)) {
            _lastConversionError = "Invalid currency code(s) for rate lookup.";
            return 0;
        }
        if (fromCurrency === toCurrency) {
             _lastConversionError = "";
             _lastConversionStatus = "Same currencies, rate is 1.";
             return 1;
        }

        const fromRates = HYPOTHETICAL_EXCHANGE_RATES[fromCurrency];
        if (fromRates && fromRates[toCurrency]) {
            _lastConversionError = "";
            _lastConversionStatus = "Direct rate found.";
            return fromRates[toCurrency];
        } else {
            const toRates = HYPOTHETICAL_EXCHANGE_RATES[toCurrency];
            if (toRates && toRates[fromCurrency]) {
                _lastConversionError = "";
                _lastConversionStatus = "Inverse rate found.";
                return 1 / toRates[fromCurrency]; // Calculate inverse
            } else {
                _lastConversionError = `No hypothetical rate for ${fromCurrency} to ${toCurrency}.`;
                _lastConversionStatus = "Rate lookup failed.";
                return 0;
            }
        }
    }

    // Comprehensive list of locales to cover "50% of languages globally"
    // This is a representative set, not exhaustive 50%, to keep menu manageable.
    const ALL_LOCALES = [
        'en-US', 'en-GB', 'en-CA', 'en-AU', 'en-IN', // English variants
        'es-ES', 'es-MX', 'es-AR', 'es-CO', // Spanish variants
        'fr-FR', 'fr-CA', // French variants
        'de-DE', 'de-AT', 'de-CH', // German variants
        'it-IT', // Italian
        'pt-PT', 'pt-BR', // Portuguese variants
        'ru-RU', // Russian
        'zh-CN', 'zh-TW', 'zh-HK', // Chinese variants (Mandarin, Traditional, Cantonese)
        'ja-JP', // Japanese
        'ko-KR', // Korean
        'ar-SA', 'ar-AE', 'ar-EG', // Arabic variants
        'hi-IN', // Hindi
        'bn-BD', // Bengali (Bangladesh)
        'pa-IN', // Punjabi (India)
        'mr-IN', // Marathi (India)
        'te-IN', // Telugu (India)
        'ta-IN', // Tamil (India)
        'ur-PK', // Urdu (Pakistan)
        'id-ID', // Indonesian
        'ms-MY', // Malay (Malaysia)
        'th-TH', // Thai
        'vi-VN', // Vietnamese
        'tr-TR', // Turkish
        'pl-PL', // Polish
        'nl-NL', // Dutch
        'sv-SE', // Swedish
        'no-NO', // Norwegian
        'da-DK', // Danish
        'fi-FI', // Finnish
        'cs-CZ', // Czech
        'hu-HU', // Hungarian
        'el-GR', // Greek
        'he-IL', // Hebrew
        'uk-UA', // Ukrainian
        'ro-RO', // Romanian
        'bg-BG', // Bulgarian
        'sk-SK', // Slovak
        'hr-HR', // Croatian
        'sr-Cyrl-RS', // Serbian (Cyrillic)
        'sl-SI', // Slovenian
        'et-EE', // Estonian
        'lv-LV', // Latvian
        'lt-LT', // Lithuanian
        'is-IS', // Icelandic
        'ga-IE', // Irish
        'cy-GB', // Welsh
        'az-AZ', // Azerbaijani
        'ka-GE', // Georgian
        'hy-AM', // Armenian
        'fa-IR', // Persian (Iran)
        'uz-UZ', // Uzbek
        'kk-KZ', // Kazakh
        'mn-MN', // Mongolian
        'ne-NP', // Nepali
        'si-LK', // Sinhala (Sri Lanka)
        'km-KH', // Khmer (Cambodia)
        'lo-LA', // Lao (Laos)
        'my-MM', // Burmese (Myanmar)
        'ka-GE', // Georgian
        'am-ET', // Amharic (Ethiopia)
        'sw-KE', // Swahili (Kenya)
        'ha-NG', // Hausa (Nigeria)
        'yo-NG', // Yoruba (Nigeria)
        'ig-NG', // Igbo (Nigeria)
        'zu-ZA', // Zulu (South Africa)
        'xh-ZA', // Xhosa (South Africa)
        'af-ZA', // Afrikaans (South Africa)
        'so-SO', // Somali (Somalia)
        'rw-RW', // Kinyarwanda (Rwanda)
        'ky-KG', // Kyrgyz (Kyrgyzstan)
        'tk-TM', // Turkmen (Turkmenistan)
        'tg-TJ', // Tajik (Tajikistan)
        'ps-AF', // Pashto (Afghanistan)
        'ku-TR', // Kurdish (Turkey)
        'ug-CN', // Uyghur (China)
        'fy-NL', // Frisian (Netherlands)
        'gd-GB', // Scottish Gaelic (UK)
        'kw-GB', // Cornish (UK)
        'mi-NZ', // Maori (New Zealand)
        'sm-WS', // Samoan (Samoa)
        'to-TO', // Tongan (Tonga)
        'fj-FJ', // Fijian (Fiji)
        'gil-KI',// Gilbertese (Kiribati)
        'mh-MH', // Marshallese (Marshall Islands)
        'na-NR', // Nauruan (Nauru)
        'tkl-TK',// Tokelauan (Tokelau)
        'wal-ET',// Wolaytta (Ethiopia)
        'wo-SN', // Wolof (Senegal)
        'xh-ZA', // Xhosa (South Africa)
        'ii-CN', // Yi (China)
        'za-CN', // Zhuang (China)
        'ace-ID',// Acehnese (Indonesia)
        'akn-PE',// Akun (Peru)
        'alt-RU',// Altai (Russia)
        'arn-CL',// Mapudungun (Chile)
        'ast-ES',// Asturian (Spain)
        'awa-IN',// Awadhi (India)
        'ay-BO', // Aymara (Bolivia)
        'ba-RU', // Bashkir (Russia)
        'bcc-IR',// Southern Balochi (Iran)
        'bcl-PH',// Central Bikol (Philippines)
        'be-BY', // Belarusian (Belarus)
        'ber-DZ',// Berber (Algeria) - generic
        'bho-IN',// Bhojpuri (India)
        'bi-VU', // Bislama (Vanuatu)
        'bjd-NG',// Bandjoun (Cameroon)
        'bpy-IN',// Bishnupriya (India)
        'br-FR', // Breton (France)
        'bug-ID',// Buginese (Indonesia)
        'byn-ER',// Bilen (Eritrea)
        'ca-ES', // Catalan (Spain)
        'ce-RU', // Chechen (Russia)
        'ch-GU', // Chamorro (Guam)
        'chk-FM',// Chuukese (Micronesia)
        'cr-CA', // Cree (Canada)
        'csb-PL',// Kashubian (Poland)
        'cv-RU', // Chuvash (Russia)
        'dv-MV', // Dhivehi (Maldives)
        'dz-BT', // Dzongkha (Bhutan)
        'ee-GH', // Ewe (Ghana)
        'eo-EO', // Esperanto (Generic)
        'eu-ES', // Basque (Spain)
        'fo-FO', // Faroese (Faroe Islands)
        'frp-FR',// Arpitan (France)
        'ff-SN', // Fulah (Senegal)
        'gl-ES', // Galician (Spain)
        'gn-PY', // Guarani (Paraguay)
        'gu-IN', // Gujarati (India)
        'gv-IM', // Manx (Isle of Man)
        'haw-US',// Hawaiian (United States)
        'hmn-LA',// Hmong (Laos)
        'hr-HR', // Croatian
        'ht-HT', // Haitian Creole (Haiti)
        'ia-IA', // Interlingua (Generic)
        'ig-NG', // Igbo (Nigeria)
        'ik-CA', // Inupiaq (Canada)
        'ilo-PH',// Ilocano (Philippines)
        'iu-CA', // Inuktitut (Canada)
        'jv-ID', // Javanese (Indonesia)
        'kab-DZ',// Kabyle (Algeria)
        'kl-GL', // Greenlandic (Greenland)
        'kn-IN', // Kannada (India)
        'ks-IN', // Kashmiri (India)
        'ku-IQ', // Kurdish (Iraq)
        'kv-RU', // Komi (Russia)
        'kw-GB', // Cornish (United Kingdom)
        'ky-KG', // Kyrgyz (Kyrgyzstan)
        'lb-LU', // Luxembourgish (Luxembourg)
        'lez-RU',// Lezghian (Russia)
        'lg-UG', // Ganda (Uganda)
        'li-NL', // Limburgish (Netherlands)
        'ln-CD', // Lingala (Congo - Kinshasa)
        'lo-LA', // Lao (Laos)
        'lrc-IR',// Northern Luri (Iran)
        'lus-IN',// Mizo (India)
        'mad-ID',// Madurese (Indonesia)
        'mg-MG', // Malagasy (Madagascar)
        'mhr-RU',// Eastern Mari (Russia)
        'mk-MK', // Macedonian (North Macedonia)
        'ml-IN', // Malayalam (India)
        'mni-IN',// Manipuri (India)
        'moh-CA',// Mohawk (Canada)
        'mt-MT', // Maltese (Malta)
        'my-MM', // Burmese (Myanmar)
        'nb-NO', // Norwegian Bokmål (Norway)
        'nd-ZW', // North Ndebele (Zimbabwe)
        'ne-NP', // Nepali (Nepal)
        'ng-NA', // Ndonga (Namibia)
        'nhn-MX',// Central Nahuatl (Mexico)
        'nqo-GN',// N'ko (Guinea)
        'oc-FR', // Occitan (France)
        'om-ET', // Oromo (Ethiopia)
        'or-IN', // Odia (India)
        'os-RU', // Ossetic (Russia)
        'pa-IN', // Punjabi (India)
        'pap-AW',// Papiamento (Aruba)
        'pms-IT',// Piedmontese (Italy)
        'ps-AF', // Pashto (Afghanistan)
        'qu-PE', // Quechua (Peru)
        'rm-CH', // Romansh (Switzerland)
        'rn-BI', // Rundi (Burundi)
        'ro-MD', // Romanian (Moldova)
        'sah-RU',// Yakut (Russia)
        'sat-IN',// Santali (India)
        'sc-IT', // Sardinian (Italy)
        'sd-IN', // Sindhi (India)
        'se-NO', // Northern Sami (Norway)
        'sg-CF', // Sango (Central African Republic)
        'sh-BA', // Serbo-Croatian (Bosnia and Herzegovina)
        'shi-MA',// Tachelhit (Morocco)
        'si-LK', // Sinhala (Sri Lanka)
        'sje-SE',// Pite Sami (Sweden)
        'sm-WS', // Samoan (Samoa)
        'sn-ZW', // Shona (Zimbabwe)
        'so-SO', // Somali (Somalia)
        'sq-AL', // Albanian (Albania)
        'sr-Latn-RS',// Serbian (Latin) (Serbia)
        'ss-SZ', // Swati (Eswatini)
        'st-LS', // Southern Sotho (Lesotho)
        'su-ID', // Sundanese (Indonesia)
        'sv-FI', // Swedish (Finland)
        'sw-TZ', // Swahili (Tanzania)
        'syc-SY',// Classical Syriac (Syria)
        'tg-TJ', // Tajik (Tajikistan)
        'ti-ER', // Tigrinya (Eritrea)
        'tk-TM', // Turkmen (Turkmenistan)
        'tl-PH', // Tagalog (Philippines)
        'tn-BW', // Tswana (Botswana)
        'to-TO', // Tongan (Tonga)
        'ts-ZA', // Tsonga (South Africa)
        'tt-RU', // Tatar (Russia)
        'ty-PF', // Tahitian (French Polynesia)
        'ug-CN', // Uyghur (China)
        'vec-IT',// Venetian (Italy)
        've-ZA', // Venda (South Africa)
        'vot-RU',// Votic (Russia)
        'wa-BE', // Walloon (Belgium)
        'wo-SN', // Wolof (Senegal)
        'xog-UG',// Soga (Uganda)
        'ydd-IL',// Northeastern Yiddish (Israel)
        'yi-US', // Yiddish (United States)
        'yo-NG', // Yoruba (Nigeria)
        'yue-HK',// Cantonese (Hong Kong)
        'za-CN', // Zhuang (China)
        'zea-NL',// Zeelandic (Netherlands)
        'zgh-MA',// Standard Moroccan Tamazight (Morocco)
        'zu-ZA', // Zulu (South Africa)
    ].sort(); // Sort alphabetically for easier navigation in the menu

    // --- Scratch Extension Definition ---
    class CurrencyConversionExtension {
        getInfo() {
            return {
                id: 'currencyconversion',
                name: 'Currency Conversion',
                color1: EXTENSION_COLOR,
                blockIconURI: BLOCK_ICON_URI,
                menuIconURI: MENU_ICON_URI,
                blocks: [
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text: '- Currency Converter (Language) -'
                    },
                    {
                        opcode: 'convertCurrencyAmount',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'convert [AMOUNT] [FROM_CURRENCY] to [TO_CURRENCY]',
                        arguments: {
                            AMOUNT: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 100
                            },
                            FROM_CURRENCY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'USD',
                                menu: 'currencyMenu'
                            },
                            TO_CURRENCY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'EUR',
                                menu: 'currencyMenu'
                            }
                        },
                        func: 'convertCurrencyAmount'
                    },
                    {
                        opcode: 'formatCurrencyString',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'format [AMOUNT] in [CURRENCY_CODE] locale [LOCALE]',
                        arguments: {
                            AMOUNT: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1234.56
                            },
                            CURRENCY_CODE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'USD',
                                menu: 'currencyMenu'
                            },
                            LOCALE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'en-US',
                                menu: 'localeMenu'
                            }
                        },
                        func: 'formatCurrencyString'
                    },
                    {
                        opcode: 'getCurrencySymbolBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'symbol for [CURRENCY_CODE]',
                        arguments: {
                            CURRENCY_CODE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'USD',
                                menu: 'currencyMenu'
                            }
                        },
                        func: 'getCurrencySymbolBlock'
                    },
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text: '- Currency String -'
                    },
                    {
                        opcode: 'formatNumberAbbreviatedBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'abbreviate [NUMBER] with [DECIMAL_PLACES] decimals',
                        arguments: {
                            NUMBER: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1234567
                            },
                            DECIMAL_PLACES: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 2
                            }
                        },
                        func: 'formatNumberAbbreviatedBlock'
                    },
                    {
                        opcode: 'formatNumberWithLocale',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'format number [NUMBER] locale [LOCALE]',
                        arguments: {
                            NUMBER: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 12345.678
                            },
                            LOCALE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'en-US',
                                menu: 'localeMenu'
                            }
                        },
                        func: 'formatNumberWithLocale'
                    },
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text: '- Currency Data -'
                    },
                    {
                        opcode: 'isValidCurrencyCodeBlock',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: '[CURRENCY_CODE] is valid currency code?',
                        arguments: {
                            CURRENCY_CODE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'USD',
                                menu: 'currencyMenu'
                            }
                        },
                        func: 'isValidCurrencyCodeBlock'
                    },
                    {
                        opcode: 'isCurrencyConvertibleBlock',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: '[FROM_CURRENCY] to [TO_CURRENCY] is convertible?',
                        arguments: {
                            FROM_CURRENCY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'USD',
                                menu: 'currencyMenu'
                            },
                            TO_CURRENCY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'EUR',
                                menu: 'currencyMenu'
                            }
                        },
                        func: 'isCurrencyConvertibleBlock'
                    },
                    {
                        opcode: 'getAvailableCurrenciesBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'get all supported currency codes (JSON Array)',
                        func: 'getAvailableCurrenciesBlock',
                        disableMonitor: true // Can be a long string, better not to monitor directly
                    },
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text: '- Currency Data Status -'
                    },
                    {
                        opcode: 'getLastConversionErrorBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'last conversion error',
                        func: 'getLastConversionError' // Corrected function name
                    },
                    {
                        opcode: 'getLastConversionStatusBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'last conversion status',
                        func: 'getLastConversionStatus' // Corrected function name
                    },
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text: '- Global Currency Data Status (Advanced) -'
                    },
                    {
                        opcode: 'getHypotheticalExchangeRateBlock',
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.SQUARE, // Square shape for advanced
                        text: 'hypothetical exchange rate from [FROM_CURRENCY] to [TO_CURRENCY]',
                        arguments: {
                            FROM_CURRENCY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'USD',
                                menu: 'currencyMenu'
                            },
                            TO_CURRENCY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'EUR',
                                menu: 'currencyMenu'
                            }
                        },
                        func: 'getHypotheticalExchangeRateBlock'
                    }
                ],
                menus: {
                    currencyMenu: {
                        acceptReporters: true,
                        items: SUPPORTED_CURRENCIES
                    },
                    localeMenu: {
                        acceptReporters: true,
                        items: ALL_LOCALES
                    }
                }
            };
        }

        // --- Block Implementations ---

        convertCurrencyAmount(args) {
            return convertCurrency(args);
        }

        formatCurrencyString(args) {
            return formatCurrencyForLocale(Number(args.AMOUNT), String(args.CURRENCY_CODE), String(args.LOCALE));
        }

        formatNumberAbbreviatedBlock(args) {
            return formatNumberAbbreviated(args);
        }

        formatNumberWithLocale(args) {
            return formatNumberForLocale(Number(args.NUMBER), String(args.LOCALE));
        }

        getCurrencySymbolBlock(args) {
            return getCurrencySymbol(args);
        }

        isValidCurrencyCodeBlock(args) {
            return isValidCurrencyCode(args);
        }

        isCurrencyConvertibleBlock(args) {
            return isCurrencyConvertible(args);
        }

        getAvailableCurrenciesBlock() {
            return getAvailableCurrencies();
        }

        getLastConversionError() { // Corrected method name
            return _lastConversionError;
        }

        getLastConversionStatus() { // Corrected method name
            return _lastConversionStatus;
        }

        getHypotheticalExchangeRateBlock(args) {
            return getHypotheticalExchangeRate(args);
        }
    }

    Scratch.extensions.register(new CurrencyConversionExtension());
})(Scratch);