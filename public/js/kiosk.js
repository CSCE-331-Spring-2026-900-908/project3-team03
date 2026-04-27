(function () {
    const pageData = window.kioskPageData || {};
    const menuData = pageData.menuData || { categories: {}, addons: [] };
    const drinkStyleMap = pageData.drinkStyleMap || {};
    const quizDrinkProfiles = pageData.quizDrinkProfiles || {};
    const sugarOptions = ['0%', '25%', '50%', '75%', '100%'];
    const iceOptions = ['No Ice', 'Light Ice', 'Regular Ice', 'Extra Ice'];
    const ICE_CUBE_IMAGE_SRC = '/images/Ice%20Cubes.svg';
    const categoryTabs = document.getElementById('categoryTabs');
    const menuGrid = document.getElementById('menuGrid');
    const addonGrid = document.getElementById('addonGrid');
    const qtyValueEl = document.getElementById('qtyValue');
    const orderListEl = document.getElementById('orderList');
    const orderTotalEl = document.getElementById('orderTotal');
    const clearOrderBtn = document.getElementById('clearOrder');
    const checkoutOrderBtn = document.getElementById('checkoutOrder');
    const widgetDockEl = document.getElementById('widgetDock');
    const menuColumnEl = document.getElementById('menuColumn');
    const orderColumnEl = document.getElementById('orderColumn');
    const resultOverlayEl = document.getElementById('resultOverlay');
    const resultCardEl = document.getElementById('resultCard');
    const resultTitleEl = document.getElementById('resultTitle');
    const resultMessageEl = document.getElementById('resultMessage');
    const resultTicketEl = document.getElementById('resultTicket');
    const resultOkBtn = document.getElementById('resultOkBtn');
    const customizeOverlay = document.getElementById('customizeOverlay');
    const customizeDrinkTitleEl = document.getElementById('customizeDrinkTitle');
    const customizeDrinkPriceEl = document.getElementById('customizeDrinkPrice');
    const sugarGrid = document.getElementById('sugarGrid');
    const iceGrid = document.getElementById('iceGrid');
    const modalDrinkPreviewMount = document.getElementById('modalDrinkPreviewMount');
    const iceCubeIndicator = document.getElementById('iceCubeIndicator');
    const previewWaveOverlay = document.getElementById('previewWaveOverlay');
    const addonCategoryTabs = document.getElementById('addonCategoryTabs');
    const closeCustomizeBtn = document.getElementById('closeCustomize');
    const cancelCustomizeBtn = document.getElementById('cancelCustomize');
    const saveCustomizeBtn = document.getElementById('saveCustomize');
    const openQuizWidgetBtn = document.getElementById('openQuizWidget');
    const quizOverlayEl = document.getElementById('quizOverlay');
    const closeQuizBtn = document.getElementById('closeQuiz');
    const quizProgressTextEl = document.getElementById('quizProgressText');
    const quizProgressBarEl = document.getElementById('quizProgressBar');
    const quizQuestionPromptEl = document.getElementById('quizQuestionPrompt');
    const quizChoicesEl = document.getElementById('quizChoices');
    const quizQuestionViewEl = document.getElementById('quizQuestionView');
    const quizResultViewEl = document.getElementById('quizResultView');
    const quizResultPreviewMountEl = document.getElementById('quizResultPreviewMount');
    const quizResultDrinkNameEl = document.getElementById('quizResultDrinkName');
    const quizResultReasonEl = document.getElementById('quizResultReason');
    const quizResultMetaEl = document.getElementById('quizResultMeta');
    const quizAddDrinkBtn = document.getElementById('quizAddDrink');
    const quizCustomizeDrinkBtn = document.getElementById('quizCustomizeDrink');
    const retakeQuizBtn = document.getElementById('retakeQuiz');
    const originalSize = parseFloat(getComputedStyle(document.documentElement).fontSize);

    const cubeStackLayers = [
        { id: 'Cube_Topping_Stack_0', scale: 1.0, insertBehind: false },
        { id: 'Cube_Topping_Stack_1', scale: 0.82, insertBehind: true },
        { id: 'Cube_Topping_Stack_2', scale: 0.64, insertBehind: true }
    ];

    const addonStackConfigs = {
        cube: {
            sourceId: 'Cube_Topping',
            hideSource: true,
            layers: cubeStackLayers
        },
        ball: {
            sourceId: 'Bobba',
            hideSource: false,
            layers: [
                { id: 'Bobba_Stack_0', scale: 1.0, insertBehind: false },
                { id: 'Bobba_Stack_1', scale: 0.82, insertBehind: true },
                { id: 'Bobba_Stack_2', scale: 0.64, insertBehind: true }
            ]
        },
        seeds: {
            sourceId: 'Seeds',
            hideSource: false,
            layers: [
                { id: 'Seeds_Stack_0', scale: 1.0, insertBehind: false },
                { id: 'Seeds_Stack_1', scale: 0.82, insertBehind: true },
                { id: 'Seeds_Stack_2', scale: 0.64, insertBehind: true }
            ]
        },
        syrup: {
            sourceId: 'Syrup',
            hideSource: false,
            layers: [
                { id: 'Syrup_Stack_0', scale: 1.0, insertBehind: false },
                { id: 'Syrup_Stack_1', scale: 0.88, insertBehind: true },
                { id: 'Syrup_Stack_2', scale: 0.76, insertBehind: true }
            ]
        }
    };

    const addonCategoryOrder = ['ball', 'seeds', 'cube', 'syrup', 'extras'];
    const addonCategoryLabels = {
        ball: 'Ball',
        seeds: 'Seeds',
        cube: 'Cube',
        syrup: 'Syrup',
        extras: 'Extras'
    };

    const addonCategoryTabColors = {
        ball: '#f8d8e8',
        seeds: '#dff2d8',
        cube: '#ffe4d6',
        syrup: '#dff4ff',
        extras: '#fdecc8'
    };

    const categoryTabColors = {
        'Milk Tea': '#f8d8e8',
        'Tea': '#dff2d8',
        'Fruit Tea': '#ffe4d6',
        'Smoothie': '#f9e2ff',
        'Specialty': '#fdecc8',
        'Energy': '#fff4b8',
        'Sour': '#e1f7e7',
        'Matcha': '#d7f0d3',
        'SEASONAL': '#dff4ff',
        'Seasonal': '#dff4ff'
    };

    const addonVisualMap = {
        'boba': { type: 'ball', color: '#2f1707' },
        'strawberry popping boba': { type: 'ball', color: '#f28aa5' },
        'eye of newt': { type: 'ball', color: '#7f5aa2' },
        'jelly coffee': { type: 'cube', color: '#6f4e37' },
        'jelly grass': { type: 'cube', color: '#1f1f1f' },
        'jelly tuna': { type: 'cube', color: '#f1b6a8' },
        'aloe vera': { type: 'cube', color: '#d8f3c4' },
        'milk foam': { type: 'syrup', color: '#fff7dc' },
        'milk oat': { type: 'syrup', color: '#efe6d6' },
        'honey': { type: 'syrup', color: '#f5c542' },
        'chamoy': { type: 'syrup', color: '#c94f3d' },
        'lemon juice': { type: 'syrup', color: '#f6e27a' },
        'cocoa powder': { type: 'syrup', color: '#7a4a2f' },
        'taro': { type: 'syrup', color: '#b9a0dc' },
        'yogurt base': { type: 'syrup', color: '#f5f2ea' },
        'syrup chocolate': { type: 'syrup', color: '#6b3e26' },
        'syrup strawberry': { type: 'syrup', color: '#f07f93' },
        'syrup mango': { type: 'syrup', color: '#f5b54c' },
        'syrup caramel': { type: 'syrup', color: '#b9783f' },
        'syrup vanilla': { type: 'syrup', color: '#f1dfb3' },
        'syrup brown sugar': { type: 'syrup', color: '#8b5a3c' },
        'seeds chia': { type: 'seeds', color: '#3a3a3a' },
        'basil seeds': { type: 'seeds', color: '#2f3b2f' }
    };

    let currentCategory = Object.keys(menuData.categories)[0] || null;
    let currentAddonCategory = 'ball';
    let selectedDrink = null;
    let selectedAddons = [];
    let cubeAddonOrder = [];
    let selectedSugar = '100%';
    let selectedIce = 'Regular Ice';
    let quantity = 1;
    let order = [];
    let drinkSvgTemplate = null;
    let customizationDraft = null;
    let editingOrderIndex = null;
    const menuPreviewCache = new Map();
    let previewWaveTimer = null;
    let previewWaveCleanupTimer = null;
    let resultOverlayTimer = null;
    let quizStepIndex = 0;
    let quizAnswers = {};
    let currentQuizRecommendation = null;
    
    // Map each quiz question and answer option to specific weights
    const quizQuestions = [
        {
            id: 'vibe',
            prompt: 'What’s your vibe today?',
            options: [
                { id: 'chill', label: 'Chill / Relaxing', effects: { chill: 3, creamy: 1, safe: 1 } },
                { id: 'energetic', label: 'Energetic / Need a boost', effects: { energetic: 4, extraSweet: 1, adventurous: 1 } },
                { id: 'treat', label: 'Treat myself / Sweet craving', effects: { treat: 4, rich: 2, sweet: 2 } },
                { id: 'fresh', label: 'Fresh / Light', effects: { fresh: 4, fruity: 2, noSugar: 1 } }
            ]
        },
        {
            id: 'sweetness',
            prompt: 'How sweet do you want it?',
            options: [
                { id: 'none', label: 'No sugar', sugar: '0%', effects: { noSugar: 4, fresh: 1 } },
                { id: 'slight', label: 'Slightly sweet', sugar: '25%', effects: { slightlySweet: 4, fresh: 1 } },
                { id: 'sweet', label: 'Sweet', sugar: '75%', effects: { sweet: 4, creamy: 1 } },
                { id: 'extra', label: 'Extra sweet', sugar: '100%', effects: { extraSweet: 4, treat: 1 } }
            ]
        },
        {
            id: 'toppings',
            prompt: 'How do you feel about toppings?',
            options: [
                { id: 'none', label: 'No toppings', effects: { noToppings: 4, safe: 1 } },
                { id: 'classic', label: 'Classic boba', effects: { classicBoba: 4, safe: 1 } },
                { id: 'lots', label: 'Lots of toppings', effects: { lotsToppings: 4, adventurous: 1 } },
                { id: 'surprise', label: 'Surprise me', effects: { surpriseToppings: 4, adventurous: 2, surprise: 1 } }
            ]
        },
        {
            id: 'flavor',
            prompt: 'Pick your flavor style:',
            options: [
                { id: 'creamy', label: 'Creamy / milk tea', effects: { creamy: 4, chill: 1 } },
                { id: 'fruity', label: 'Fruity', effects: { fruity: 4, fresh: 2 } },
                { id: 'tea', label: 'Tea-forward / classic', effects: { teaForward: 4, safe: 2 } },
                { id: 'rich', label: 'Rich / dessert-like', effects: { rich: 4, treat: 2 } }
            ]
        },
        {
            id: 'adventure',
            prompt: 'How adventurous are you?',
            options: [
                { id: 'safe', label: 'Play it safe', effects: { safe: 4, chill: 1 } },
                { id: 'new', label: 'Try something new', effects: { adventurous: 4, fresh: 1 } },
                { id: 'surprise', label: 'Surprise me completely', effects: { surprise: 5, adventurous: 3 } }
            ]
        }
    ];

    function normalizeAddonName(name) {
        return String(name || '').trim().toLowerCase();
    }

    function translateName(name) {
        return name;
    }

    function getAddonVisualConfig(name) {
        const normalizedName = normalizeAddonName(name);
        if (addonVisualMap[normalizedName]) {
            return addonVisualMap[normalizedName];
        }

        if (normalizedName.includes('boba') || normalizedName.includes('newt')) {
            return { type: 'ball', color: '#2f1707' };
        }

        if (normalizedName.includes('seed')) {
            return { type: 'seeds', color: '#2f3b2f' };
        }

        if (normalizedName.includes('jelly') || normalizedName.includes('aloe')) {
            return { type: 'cube', color: '#d8f3c4' };
        }

        if (
            normalizedName.includes('syrup') ||
            normalizedName.includes('foam') ||
            normalizedName.includes('honey') ||
            normalizedName.includes('juice') ||
            normalizedName.includes('powder') ||
            normalizedName.includes('taro') ||
            normalizedName.includes('milk') ||
            normalizedName.includes('yogurt')
        ) {
            return { type: 'syrup', color: '#c58940' };
        }

        return { type: 'cube', color: '#d8f3c4' };
    }

    function getAddonDisplayCategory(name) {
        const normalizedName = normalizeAddonName(name);

        if (
            normalizedName.includes('foam') ||
            normalizedName === 'milk oat' ||
            normalizedName === 'taro' ||
            normalizedName === 'chamoy' ||
            normalizedName === 'cocoa powder' ||
            normalizedName === 'yogurt base'
        ) {
            return 'extras';
        }

        return getAddonVisualConfig(name).type;
    }

    function extractDrinkSvgTemplate(svgAssetText) {
        const parser = new DOMParser();
        const assetDoc = parser.parseFromString(svgAssetText, 'text/html');
        const svg = assetDoc.querySelector('svg');
        return svg ? svg.cloneNode(true) : null;
    }

    function createDrinkSvgInstance() {
        return drinkSvgTemplate ? drinkSvgTemplate.cloneNode(true) : null;
    }

    function getGroupFromSvg(svgRoot, id) {
        if (!svgRoot) return null;
        return svgRoot.querySelector(`#${CSS.escape(id)}`);
    }

    function setLayerVisibleOnSvg(svgRoot, groupId, isVisible) {
        const group = getGroupFromSvg(svgRoot, groupId);
        if (!group) return;
        group.style.display = isVisible ? '' : 'none';
    }

    function setGroupFillOnSvg(svgRoot, groupId, color) {
        const group = getGroupFromSvg(svgRoot, groupId);
        if (!group) return;

        const shapes = group.querySelectorAll('path, rect, circle, ellipse, polygon, polyline');
        shapes.forEach((shape) => {
            shape.setAttribute('fill', color);
        });
    }

    function ensureClonedLayerOnSvg(svgRoot, sourceId, newId, scale = 1, insertBehind = false) {
        if (!svgRoot) return null;

        const existing = getGroupFromSvg(svgRoot, newId);
        if (existing) return existing;

        const source = getGroupFromSvg(svgRoot, sourceId);
        if (!source || !source.parentNode) return null;

        const clone = source.cloneNode(true);
        clone.setAttribute('id', newId);
        clone.style.display = 'none';
        clone.style.transformBox = 'fill-box';
        clone.style.transformOrigin = 'center';
        clone.style.transform = `scale(${scale})`;

        if (insertBehind) {
            source.parentNode.insertBefore(clone, source);
        } else {
            source.parentNode.appendChild(clone);
        }

        return clone;
    }

    function resetAddonStackOnSvg(svgRoot, stackType) {
        const stackConfig = addonStackConfigs[stackType];
        if (!stackConfig) return;

        stackConfig.layers.forEach((layer) => setLayerVisibleOnSvg(svgRoot, layer.id, false));
    }

    function setupAddonLayersOnSvg(svgRoot) {
        if (!svgRoot) return;

        Object.entries(addonStackConfigs).forEach(([stackType, stackConfig]) => {
            stackConfig.layers.forEach((layer) => {
                ensureClonedLayerOnSvg(svgRoot, stackConfig.sourceId, layer.id, layer.scale, layer.insertBehind);
            });

            if (stackConfig.hideSource) {
                setLayerVisibleOnSvg(svgRoot, stackConfig.sourceId, false);
            }

            resetAddonStackOnSvg(svgRoot, stackType);
        });
    }

    function setLiquidGradientOnSvg(svgRoot, topColor, midColor, bottomColor) {
        if (!svgRoot) return;

        const stops = svgRoot.querySelectorAll('#linear-gradient stop');
        if (stops.length < 3) return;

        stops[0].setAttribute('stop-color', bottomColor);
        stops[1].setAttribute('stop-color', midColor);
        stops[2].setAttribute('stop-color', topColor);
    }

    function setBobbaOnSvg(svgRoot, enabled, color = null) {
        setLayerVisibleOnSvg(svgRoot, 'Bobba', enabled);
        if (enabled && color) setGroupFillOnSvg(svgRoot, 'Bobba', color);
    }

    function setSeedsOnSvg(svgRoot, enabled, color = null) {
        setLayerVisibleOnSvg(svgRoot, 'Seeds', enabled);
        if (enabled && color) setGroupFillOnSvg(svgRoot, 'Seeds', color);
    }

    function setSyrupOnSvg(svgRoot, enabled, color = null) {
        setLayerVisibleOnSvg(svgRoot, 'Syrup', enabled);
        if (enabled && color) setGroupFillOnSvg(svgRoot, 'Syrup', color);
    }

    function applyDrinkStyleToSvg(svgRoot, drinkConfig) {
        if (!svgRoot || !drinkConfig) return;

        if (drinkConfig.lid_color) setGroupFillOnSvg(svgRoot, 'Lid', drinkConfig.lid_color);
        if (drinkConfig.straw_color) setGroupFillOnSvg(svgRoot, 'Straw', drinkConfig.straw_color);

        if (drinkConfig.liquid_top && drinkConfig.liquid_mid && drinkConfig.liquid_bottom) {
            setLiquidGradientOnSvg(
                svgRoot,
                drinkConfig.liquid_top,
                drinkConfig.liquid_mid,
                drinkConfig.liquid_bottom
            );
        }

        setBobbaOnSvg(svgRoot, !!drinkConfig.show_bobba, drinkConfig.bobba_color || null);
        setSeedsOnSvg(svgRoot, !!drinkConfig.show_seeds, drinkConfig.seeds_color || null);
        setSyrupOnSvg(svgRoot, !!drinkConfig.show_syrup, drinkConfig.syrup_color || null);

        Object.entries(addonStackConfigs).forEach(([stackType, stackConfig]) => {
            if (stackConfig.hideSource) {
                setLayerVisibleOnSvg(svgRoot, stackConfig.sourceId, false);
            }
            resetAddonStackOnSvg(svgRoot, stackType);
        });
    }

    function renderAddonStackOnSvg(svgRoot, stackType, addonNames) {
        if (!svgRoot) return;

        const stackConfig = addonStackConfigs[stackType];
        if (!stackConfig) return;

        if (stackConfig.hideSource) {
            setLayerVisibleOnSvg(svgRoot, stackConfig.sourceId, false);
        }

        resetAddonStackOnSvg(svgRoot, stackType);

        addonNames.slice(0, stackConfig.layers.length).forEach((addonName, index) => {
            const layerId = stackConfig.layers[index].id;
            const color = getAddonVisualConfig(addonName).color || '#d8f3c4';

            setGroupFillOnSvg(svgRoot, layerId, color);
            setLayerVisibleOnSvg(svgRoot, layerId, true);
        });
    }

    function applyAddonsToSvg(svgRoot, drink, addons, cubeNames) {
        if (!svgRoot || !drink) return;

        const baseStyle = drinkStyleMap[drink.name];
        if (!baseStyle) return;

        applyDrinkStyleToSvg(svgRoot, baseStyle);

        const ballAddons = addons.filter((addon) => getAddonVisualConfig(addon.name).type === 'ball');
        const seedAddons = addons.filter((addon) => getAddonVisualConfig(addon.name).type === 'seeds');
        const syrupAddons = addons.filter((addon) => getAddonVisualConfig(addon.name).type === 'syrup');

        renderAddonStackOnSvg(svgRoot, 'cube', cubeNames);

        if (ballAddons.length > 0) {
            renderAddonStackOnSvg(svgRoot, 'ball', ballAddons.map((addon) => addon.name));
        }

        if (seedAddons.length > 0) {
            renderAddonStackOnSvg(svgRoot, 'seeds', seedAddons.map((addon) => addon.name));
        }

        const visibleSyrupAddons = syrupAddons.filter((addon) => {
            const normalizedName = normalizeAddonName(addon.name);
            return !['taro', 'chamoy', 'milk oat', 'milk foam', 'cocoa powder', 'yogurt base'].includes(normalizedName);
        });

        if (visibleSyrupAddons.length > 0) {
            renderAddonStackOnSvg(svgRoot, 'syrup', visibleSyrupAddons.map((addon) => addon.name));
        }

        let gradientTop = baseStyle.liquid_top;
        let gradientMid = baseStyle.liquid_mid;
        let gradientBottom = baseStyle.liquid_bottom;

        syrupAddons.forEach((addon) => {
            const normalizedName = normalizeAddonName(addon.name);

            if (normalizedName.includes('foam') || normalizedName === 'milk oat') {
                gradientTop = normalizedName === 'milk oat' ? '#efe6d6' : '#fff7dc';
            }

            if (normalizedName === 'taro') {
                gradientTop = '#c7b0e8';
            }

            if (normalizedName === 'chamoy') {
                gradientTop = '#f08a6c';
            }

            if (normalizedName === 'cocoa powder') {
                gradientTop = '#8b5a3c';
                gradientMid = '#6f4630';
            }

            if (normalizedName === 'yogurt base') {
                gradientBottom = '#f5f2ea';
            }
        });

        if (
            gradientTop !== baseStyle.liquid_top ||
            gradientMid !== baseStyle.liquid_mid ||
            gradientBottom !== baseStyle.liquid_bottom
        ) {
            setLiquidGradientOnSvg(svgRoot, gradientTop, gradientMid, gradientBottom);
        }
    }

    function svgToDataUrl(svgRoot) {
        const serialized = new XMLSerializer().serializeToString(svgRoot);
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
    }

    function getIceCubeCount(iceLevel) {
        const counts = {
            'No Ice': 0,
            'Light Ice': 2,
            'Regular Ice': 4,
            'Extra Ice': 7
        };

        return counts[iceLevel] ?? counts['Regular Ice'];
    }

    function renderIceCubes() {
        if (!iceCubeIndicator) return;

        const cubeCount = selectedDrink ? getIceCubeCount(selectedIce) : 0;

        iceCubeIndicator.innerHTML = '';
        iceCubeIndicator.classList.toggle('is-empty', cubeCount === 0);

        for (let i = 0; i < cubeCount; i++) {
            const cube = document.createElement('img');
            cube.className = 'ice-cube-img';
            cube.src = ICE_CUBE_IMAGE_SRC;
            cube.alt = '';

            const rotations = [-10, 8, -4, 12, -14, 5, -8];
            cube.style.setProperty('--cube-rotate', `${rotations[i] || 0}deg`);

            iceCubeIndicator.appendChild(cube);
        }
    }

    function renderModalPreviewFromCurrentSvg() {
        if (!modalDrinkPreviewMount) return;

        if (!selectedDrink) {
            modalDrinkPreviewMount.innerHTML = '<div class="muted">Choose a drink to preview it here.</div>';
            renderIceCubes();
            return;
        }

        const modalSvg = createDrinkSvgInstance();
        if (!modalSvg) {
            modalDrinkPreviewMount.innerHTML = '<div class="muted">Could not load preview.</div>';
            renderIceCubes();
            return;
        }

        setupAddonLayersOnSvg(modalSvg);
        applyAddonsToSvg(modalSvg, selectedDrink, selectedAddons, cubeAddonOrder);

        const img = document.createElement('img');
        img.alt = `${selectedDrink.name} preview`;
        img.src = svgToDataUrl(modalSvg);

        modalDrinkPreviewMount.innerHTML = '';
        modalDrinkPreviewMount.appendChild(img);
        renderIceCubes();
    }

    function animateAddonPreviewUpdate() {
        if (!previewWaveOverlay) {
            updateDrinkPreviewForAddons();
            return;
        }

        if (previewWaveTimer) {
            clearTimeout(previewWaveTimer);
        }

        if (previewWaveCleanupTimer) {
            clearTimeout(previewWaveCleanupTimer);
        }

        previewWaveOverlay.classList.remove('is-animating');
        void previewWaveOverlay.offsetWidth;
        previewWaveOverlay.classList.add('is-animating');

        previewWaveTimer = setTimeout(() => {
            updateDrinkPreviewForAddons();
        }, 175);

        previewWaveCleanupTimer = setTimeout(() => {
            previewWaveOverlay.classList.remove('is-animating');
        }, 360);
    }

    function createMenuDrinkPreviewDataUrl(drink) {
        const cacheKey = `${drink.id}:${(drink.defaultAddonIds || []).join(',')}`;
        if (menuPreviewCache.has(cacheKey)) {
            return menuPreviewCache.get(cacheKey);
        }

        const svgRoot = createDrinkSvgInstance();
        if (!svgRoot) return '';

        setupAddonLayersOnSvg(svgRoot);
        const defaultAddons = getDefaultAddonsForDrink(drink);
        applyAddonsToSvg(svgRoot, drink, defaultAddons, syncCubeOrderForAddons(defaultAddons, []));

        const dataUrl = svgToDataUrl(svgRoot);
        menuPreviewCache.set(cacheKey, dataUrl);
        return dataUrl;
    }

    // Show svg image preview in the "My order" menu
    function createOrderItemPreviewDataUrl(item) {
        const svgRoot = createDrinkSvgInstance();
        if (!svgRoot) return '';

        setupAddonLayersOnSvg(svgRoot);
        const drink = findDrinkById(item.drinkId) || {
            id: item.drinkId,
            name: item.name,
            price: item.basePrice,
            defaultAddonIds: item.defaultAddonIds || []
        };
        const addons = normalizeAddonsForDrink(drink, item.addons || []);
        applyAddonsToSvg(
            svgRoot,
            drink,
            addons,
            syncCubeOrderForAddons(addons, item.cubeAddonOrder || [])
        );

        return svgToDataUrl(svgRoot);
    }

    async function loadDrinkSvg() {
        try {
            const response = await fetch('/images/DrinkFoundation.svg');
            const svgAssetText = await response.text();

            if (!response.ok) {
                throw new Error(`Drink SVG request failed: ${response.status}`);
            }

            drinkSvgTemplate = extractDrinkSvgTemplate(svgAssetText);
            if (!drinkSvgTemplate) {
                throw new Error('Could not find SVG markup in DrinkFoundation asset');
            }

            menuPreviewCache.clear();
            renderMenu();
            renderModalPreviewFromCurrentSvg();
        } catch (err) {
            console.error('Could not load drink SVG:', err);
            if (modalDrinkPreviewMount) {
                modalDrinkPreviewMount.innerHTML = '<div class="muted">Could not load drink preview</div>';
            }
        }
    }

    function clearDrinkPreviewLayers() {
        renderModalPreviewFromCurrentSvg();
    }

    function isCubeAddonName(name) {
        return getAddonVisualConfig(name).type === 'cube';
    }

    function syncCubeAddonOrder() {
        const selectedCubeNames = selectedAddons
            .filter((addon) => isCubeAddonName(addon.name))
            .map((addon) => addon.name);

        cubeAddonOrder = cubeAddonOrder.filter((name) => selectedCubeNames.includes(name));

        selectedCubeNames.forEach((name) => {
            if (!cubeAddonOrder.includes(name)) {
                cubeAddonOrder.push(name);
            }
        });
    }

    function updateDrinkPreviewForAddons() {
        if (!selectedDrink) {
            clearDrinkPreviewLayers();
            return;
        }

        const baseStyle = drinkStyleMap[selectedDrink.name];
        if (!baseStyle) {
            clearDrinkPreviewLayers();
            return;
        }

        syncCubeAddonOrder();
        renderModalPreviewFromCurrentSvg();
    }

    function money(value) {
        return value.toFixed(2);
    }

    function getCategoryTabColor(category) {
        return categoryTabColors[category] || '#fff5ee';
    }

    function getVisibleAddonCategories() {
        const categories = addonCategoryOrder.filter((category) =>
            menuData.addons.some((addon) => getAddonDisplayCategory(addon.name) === category)
        );

        return categories.length ? categories : ['ball'];
    }

    function getAddonIdKey(id) {
        return String(id);
    }

    function findDrinkById(drinkId) {
        return getAllAvailableDrinks().find((drink) => getAddonIdKey(drink.id) === getAddonIdKey(drinkId)) || null;
    }

    function getIncludedAddonIdSet(drink) {
        return new Set((drink?.defaultAddonIds || []).map((id) => getAddonIdKey(id)));
    }

    function getDefaultAddonsForDrink(drink) {
        const includedIds = getIncludedAddonIdSet(drink);
        return menuData.addons
            .filter((addon) => includedIds.has(getAddonIdKey(addon.id)))
            .map((addon) => ({
                ...addon,
                included: true
            }));
    }

    function normalizeAddonsForDrink(drink, addons = []) {
        const normalized = new Map();

        getDefaultAddonsForDrink(drink).forEach((addon) => {
            normalized.set(getAddonIdKey(addon.id), addon);
        });

        addons.forEach((addon) => {
            const key = getAddonIdKey(addon.id);
            if (normalized.has(key)) {
                normalized.set(key, {
                    ...normalized.get(key),
                    included: true
                });
                return;
            }

            normalized.set(key, {
                ...addon,
                included: false
            });
        });

        return Array.from(normalized.values());
    }

    function getChargeableAddons(addons = []) {
        return addons.filter((addon) => !addon.included);
    }

    function renderAddonCategoryTabs() {
        if (!addonCategoryTabs) return;

        const visibleCategories = getVisibleAddonCategories();
        if (!visibleCategories.includes(currentAddonCategory)) {
            currentAddonCategory = visibleCategories[0];
        }

        addonCategoryTabs.innerHTML = '';

        visibleCategories.forEach((category) => {
            const button = document.createElement('button');
            button.className = 'addon-category-tab' + (category === currentAddonCategory ? ' active' : '');
            button.type = 'button';
            button.textContent = addonCategoryLabels[category] || category;
            button.style.backgroundColor = addonCategoryTabColors[category] || '#eef6fb';
            button.onclick = () => {
                currentAddonCategory = category;
                renderAddonCategoryTabs();
                renderAddons();
            };
            addonCategoryTabs.appendChild(button);
        });
    }

    function getDefaultCustomization(drink) {
        const addons = getDefaultAddonsForDrink(drink);
        return {
            drink,
            addons,
            cubeAddonOrder: syncCubeOrderForAddons(addons, []),
            sugar: '100%',
            ice: 'Regular Ice'
        };
    }

    function getOrderItemTotal(drink, addons, itemQuantity) {
        const addonTotal = getChargeableAddons(addons).reduce((sum, addon) => sum + addon.price, 0);
        return (drink.price + addonTotal) * itemQuantity;
    }

    function getAllAvailableDrinks() {
        return Object.values(menuData.categories)
            .flat()
            .filter((drink) => String(drink.category || '').toUpperCase() !== 'ADDON');
    }

    // Turn quiz recommendations into real cart items
    function buildOrderItemFromConfig(drink, addons, sugar, ice, itemQuantity, cubeOrder = []) {
        const finalAddons = normalizeAddonsForDrink(drink, addons);
        const finalCubeOrder = syncCubeOrderForAddons(finalAddons, cubeOrder);

        return {
            drinkId: drink.id,
            name: drink.name,
            basePrice: drink.price,
            defaultAddonIds: [...(drink.defaultAddonIds || [])],
            addons: finalAddons,
            cubeAddonOrder: finalCubeOrder,
            sugar,
            ice,
            quantity: itemQuantity,
            total: getOrderItemTotal(drink, finalAddons, itemQuantity)
        };
    }

    // Show price updates on customization overlay
    function renderCustomizePrice() {
        if (!selectedDrink) {
            customizeDrinkPriceEl.textContent = '';
            return;
        }

        const total = getOrderItemTotal(selectedDrink, selectedAddons, quantity);
        const addonTotal = getChargeableAddons(selectedAddons).reduce((sum, addon) => sum + addon.price, 0) * quantity;
        const baseTotal = selectedDrink.price * quantity;

        if (addonTotal > 0) {
            customizeDrinkPriceEl.textContent = `$${money(total)} total (${quantity} x $${money(selectedDrink.price)} + $${money(addonTotal)} extra add ons)`;
            return;
        }

        customizeDrinkPriceEl.textContent = `$${money(baseTotal)} total (${quantity} x $${money(selectedDrink.price)})`;
    }

    function syncCubeOrderForAddons(addons, savedCubeOrder = []) {
        const selectedCubeNames = addons
            .filter((addon) => isCubeAddonName(addon.name))
            .map((addon) => addon.name);

        const cubeOrder = savedCubeOrder.filter((name) => selectedCubeNames.includes(name));
        selectedCubeNames.forEach((name) => {
            if (!cubeOrder.includes(name)) {
                cubeOrder.push(name);
            }
        });

        return cubeOrder;
    }

    function buildOrderItem(drink) {
        const addons = [...selectedAddons];
        return buildOrderItemFromConfig(drink, addons, selectedSugar, selectedIce, quantity, [...cubeAddonOrder]);
    }

    function openCustomizeModal(drink, existingItem = null, orderIndex = null) {
        customizationDraft = existingItem
            ? {
                drink,
                addons: normalizeAddonsForDrink(drink, existingItem.addons),
                cubeAddonOrder: syncCubeOrderForAddons(
                    normalizeAddonsForDrink(drink, existingItem.addons),
                    existingItem.cubeAddonOrder || []
                ),
                sugar: existingItem.sugar,
                ice: existingItem.ice
            }
            : getDefaultCustomization(drink);
        selectedDrink = drink;
        selectedAddons = [...customizationDraft.addons];
        cubeAddonOrder = [...customizationDraft.cubeAddonOrder];
        selectedSugar = customizationDraft.sugar;
        selectedIce = customizationDraft.ice;
        quantity = existingItem ? existingItem.quantity : 1;
        editingOrderIndex = orderIndex;

        customizeDrinkTitleEl.textContent = `Customize ${drink.name}`;
        saveCustomizeBtn.textContent = editingOrderIndex === null ? 'Add to order' : 'Save changes';
        customizeOverlay.classList.remove('hidden');

        renderSugarOptions();
        renderIceOptions();
        renderAddonCategoryTabs();
        renderAddons();
        renderQuantity();
        renderCustomizePrice();
        renderMenu();
        updateDrinkPreviewForAddons();
    }

    function closeCustomizeModal() {
        customizeOverlay.classList.add('hidden');
    }

    function saveCustomization() {
        if (!customizationDraft || !selectedDrink) return;

        customizationDraft.addons = [...selectedAddons];
        customizationDraft.cubeAddonOrder = [...cubeAddonOrder];
        customizationDraft.sugar = selectedSugar;
        customizationDraft.ice = selectedIce;

        const orderItem = buildOrderItem(selectedDrink);
        if (editingOrderIndex === null) {
            order.push(orderItem);
        } else {
            order[editingOrderIndex] = orderItem;
        }

        closeCustomizeModal();
        clearCurrentSelection();
        hideResultOverlay();
        renderQuantity();
        renderMenu();
        renderOrder();
    }

    function cancelCustomization() {
        closeCustomizeModal();
        clearCurrentSelection();
        renderAddons();
        renderQuantity();
        renderMenu();
    }

    function clearCurrentSelection() {
        selectedDrink = null;
        selectedAddons = [];
        cubeAddonOrder = [];
        selectedSugar = '100%';
        selectedIce = 'Regular Ice';
        customizationDraft = null;
        quantity = 1;
        editingOrderIndex = null;
        saveCustomizeBtn.textContent = 'Done';
        clearDrinkPreviewLayers();
    }

    function renderChoiceButtons(container, options, selectedValue, onSelect) {
        container.innerHTML = '';

        options.forEach((option) => {
            const button = document.createElement('button');
            button.className = 'choice-btn' + (option === selectedValue ? ' selected' : '');
            button.type = 'button';
            button.textContent = option;
            button.onclick = () => onSelect(option);
            container.appendChild(button);
        });
    }

    function renderSugarOptions() {
        renderChoiceButtons(sugarGrid, sugarOptions, selectedSugar, (option) => {
            selectedSugar = option;
            renderSugarOptions();
            renderQuantity();
            renderCustomizePrice();
        });
    }

    function renderIceOptions() {
        renderChoiceButtons(iceGrid, iceOptions, selectedIce, (option) => {
            selectedIce = option;
            renderIceOptions();
            renderQuantity();
            renderCustomizePrice();
            renderIceCubes();
        });
    }

    function renderTabs() {
        categoryTabs.innerHTML = '';

        const visibleCategories = Object.keys(menuData.categories).filter((category) => category.toUpperCase() !== 'ADDON');

        if (!currentCategory || !visibleCategories.length) {
            categoryTabs.innerHTML = '<div class="muted">No categories available</div>';
            return;
        }

        if (!visibleCategories.includes(currentCategory)) {
            currentCategory = visibleCategories[0] || null;
        }

        visibleCategories.forEach((category) => {
            const button = document.createElement('button');
            button.className = 'tab-btn' + (category === currentCategory ? ' active' : '');
            button.type = 'button';
            button.textContent = category;
            button.style.backgroundColor = getCategoryTabColor(category);
            button.onclick = () => {
                currentCategory = category;
                renderTabs();
                renderMenu();
            };
            categoryTabs.appendChild(button);
        });
    }

    function renderMenu() {
        menuGrid.innerHTML = '';

        if (!currentCategory || !menuData.categories[currentCategory] || menuData.categories[currentCategory].length === 0) {
            menuGrid.innerHTML = '<div class="muted">No items in this category</div>';
            return;
        }

        menuData.categories[currentCategory].forEach((item) => {
            const isSelected = selectedDrink && selectedDrink.id === item.id;
            const previewUrl = createMenuDrinkPreviewDataUrl(item);
            const button = document.createElement('button');
            button.className = 'item-btn' + (isSelected ? ' selected' : '');
            button.type = 'button';
            button.innerHTML = `
                <div class="item-btn-content">
                    ${previewUrl ? `<img class="menu-drink-thumb" src="${previewUrl}" alt="${item.name} preview">` : ''}
                    <div class="item-btn-copy">
                        <h3>${item.name}</h3>
                        <p>$${money(item.price)}</p>
                    </div>
                </div>
            `;
            button.onclick = () => {
                openCustomizeModal(item);
            };
            menuGrid.appendChild(button);
        });
    }

    function renderAddons() {
        addonGrid.innerHTML = '';

        const filteredAddons = menuData.addons.filter(
            (addon) => getAddonDisplayCategory(addon.name) === currentAddonCategory
        );

        if (filteredAddons.length === 0) {
            addonGrid.innerHTML = '<div class="muted">No add ons in this category</div>';
            return;
        }

        filteredAddons.forEach((addon) => {
            const includedIds = getIncludedAddonIdSet(selectedDrink);
            const isSelected = selectedAddons.some((a) => a.id === addon.id);
            const isIncluded = includedIds.has(getAddonIdKey(addon.id));
            const button = document.createElement('button');
            button.className = 'addon-btn' + (isSelected ? ' selected' : '') + (isIncluded ? ' included' : '');
            button.type = 'button';
            button.textContent = isIncluded
                ? `${translateName(addon.name)} Included`
                : `${translateName(addon.name)} +$${money(addon.price)}`;
            button.disabled = isIncluded;
            button.onclick = () => {
                const exists = selectedAddons.some((a) => a.id === addon.id);

                if (exists) {
                    selectedAddons = selectedAddons.filter((a) => a.id !== addon.id);
                } else {
                    selectedAddons.push(addon);
                }

                renderAddons();
                renderQuantity();
                renderCustomizePrice();
                animateAddonPreviewUpdate();
            };
            addonGrid.appendChild(button);
        });
    }

    function renderQuantity() {
        qtyValueEl.textContent = quantity;
    }

    // --------------- "Don't know what to order today? Quiz" ---------------
    function closeQuizOverlay() {
        quizOverlayEl.classList.add('hidden');
        currentQuizRecommendation = null;
    }

    function openQuizOverlay() {
        quizStepIndex = 0;
        quizAnswers = {};
        currentQuizRecommendation = null;
        quizResultViewEl.classList.add('hidden');
        quizQuestionViewEl.classList.remove('hidden');
        quizOverlayEl.classList.remove('hidden');
        renderQuizQuestion();
    }

    function renderQuizQuestion() {
        const question = quizQuestions[quizStepIndex];
        if (!question) return;

        quizProgressTextEl.textContent = `Question ${quizStepIndex + 1} of ${quizQuestions.length}`;
        quizProgressBarEl.style.width = `${((quizStepIndex + 1) / quizQuestions.length) * 100}%`;
        quizQuestionPromptEl.textContent = question.prompt;
        quizChoicesEl.innerHTML = '';

        question.options.forEach((option) => {
            const button = document.createElement('button');
            button.className = 'quiz-choice-btn';
            button.type = 'button';
            button.textContent = option.label;
            button.onclick = () => handleQuizAnswer(question, option);
            quizChoicesEl.appendChild(button);
        });
    }

    function handleQuizAnswer(question, option) {
        quizAnswers[question.id] = option;

        if (quizStepIndex < quizQuestions.length - 1) {
            quizStepIndex += 1;
            renderQuizQuestion();
            return;
        }

        currentQuizRecommendation = getQuizRecommendation();
        renderQuizRecommendation();
    }

    // Get the total quiz score (add all weights together)
    function getQuizAggregateScores() {
        const aggregate = {};

        Object.values(quizAnswers).forEach((answer) => {
            Object.entries(answer.effects || {}).forEach(([key, value]) => {
                aggregate[key] = (aggregate[key] || 0) + value;
            });
        });

        return aggregate;
    }

    function getDrinkProfile(drink) {
        return quizDrinkProfiles[String(drink.id)] || {};
    }

    // Score each drink on map (dot-product style scoring system)
    function calculateDrinkQuizScore(drink, aggregateScores) {
        const profile = getDrinkProfile(drink);
        let total = 0;

        Object.entries(aggregateScores).forEach(([key, value]) => {
            total += (profile[key] || 0) * value;
            // The drink with the highest scaled scores is selected
        });

        // Add an extra for a surprise factor
        if (quizAnswers.adventure?.id === 'surprise' && /^seasonal$/i.test(drink.category || '')) {
            total += 25;
        }

        return total;
    }

    // Choose a drink biased towards the stronger matches (nearby matches also have a chance)
    function pickWeightedRecommendation(rankedDrinks) {
        if (!rankedDrinks.length) return null;

        const bestScore = rankedDrinks[0].score;
        const minScoreForPool = Math.max(bestScore - 8, 1);
        const candidatePool = rankedDrinks
            .filter((entry, index) => index < 4 || entry.score >= minScoreForPool)
            .slice(0, 5);

        const weightedPool = candidatePool.map((entry, index) => ({
            ...entry,
            weight: Math.max(entry.score, 1) * (candidatePool.length - index)
        }));

        const totalWeight = weightedPool.reduce((sum, entry) => sum + entry.weight, 0);
        let threshold = Math.random() * totalWeight;

        for (const entry of weightedPool) {
            threshold -= entry.weight;
            if (threshold <= 0) {
                return entry;
            }
        }

        return weightedPool[0];
    }

    // Map Question 3: "How do you feel about toppings?" to real add-ons
    function getRecommendedQuizAddons(drink) {
        const toppingsAnswer = quizAnswers.toppings?.id;
        const findAddon = (name) =>
            menuData.addons.find((addon) => normalizeAddonName(addon.name) === normalizeAddonName(name));

        if (toppingsAnswer === 'none') {
            return [];
        }

        if (toppingsAnswer === 'classic') {
            return [findAddon('Boba')].filter(Boolean);
        }

        if (toppingsAnswer === 'lots') {
            return [findAddon('Boba'), findAddon('Milk foam')].filter(Boolean);
        }

        if (toppingsAnswer === 'surprise') {
            if (/fruit tea|smoothie/i.test(drink.category || '')) {
                return [findAddon('Aloe vera'), findAddon('Strawberry popping boba')].filter(Boolean);
            }

            if (/energy/i.test(drink.category || '')) {
                return [findAddon('Boba'), findAddon('Eye of newt')].filter(Boolean);
            }

            return [findAddon('Boba'), findAddon('Milk foam')].filter(Boolean);
        }

        return [];
    }

    function getRecommendationReason(drink) {
        const reasons = [];
        const flavorAnswer = quizAnswers.flavor?.id;
        const vibeAnswer = quizAnswers.vibe?.id;
        const adventureAnswer = quizAnswers.adventure?.id;

        if (flavorAnswer === 'creamy') reasons.push('you leaned creamy');
        if (flavorAnswer === 'fruity') reasons.push('you wanted something fruity');
        if (flavorAnswer === 'tea') reasons.push('you picked a tea-forward profile');
        if (flavorAnswer === 'rich') reasons.push('you were in the mood for a dessert-style drink');
        if (vibeAnswer === 'energetic') reasons.push('you asked for an energetic vibe');
        if (vibeAnswer === 'fresh') reasons.push('you wanted something fresh and light');
        if (adventureAnswer === 'surprise') reasons.push('you asked us to surprise you');

        if (reasons.length === 0) {
            return `${drink.name} fits your answers well.`;
        }

        return `${drink.name} works because ${reasons.slice(0, 2).join(' and ')}.`;
    }

    function renderQuizRecommendationPreview(recommendation) {
        if (!quizResultPreviewMountEl) return;

        if (!recommendation?.drink) {
            quizResultPreviewMountEl.innerHTML = '<div class="muted">Preview unavailable.</div>';
            return;
        }

        const previewUrl = createOrderItemPreviewDataUrl({
            drinkId: recommendation.drink.id,
            name: recommendation.drink.name,
            basePrice: recommendation.drink.price,
            addons: recommendation.addons || [],
            cubeAddonOrder: syncCubeOrderForAddons(recommendation.addons || [], []),
            sugar: recommendation.sugar,
            ice: recommendation.ice,
            quantity: recommendation.quantity || 1
        });

        if (!previewUrl) {
            quizResultPreviewMountEl.innerHTML = '<div class="muted">Preview unavailable.</div>';
            return;
        }

        quizResultPreviewMountEl.innerHTML = `<img src="${previewUrl}" alt="${recommendation.drink.name} recommended preview">`;
    }

    function getQuizRecommendation() {
        const drinks = getAllAvailableDrinks();
        const aggregateScores = getQuizAggregateScores();
        const rankedDrinks = drinks
            .map((drink) => ({
                drink,
                score: calculateDrinkQuizScore(drink, aggregateScores)
            }))
            .sort((a, b) => b.score - a.score);

        const selectedMatch = pickWeightedRecommendation(rankedDrinks);
        const recommendedDrink = selectedMatch?.drink || drinks[0] || null;
        if (!recommendedDrink) return null;

        const sugar = quizAnswers.sweetness?.sugar || '75%';
        const addons = getRecommendedQuizAddons(recommendedDrink);
        const ice = /smoothie/i.test(recommendedDrink.category || '') ? 'No Ice' : 'Regular Ice';

        return {
            drink: recommendedDrink,
            sugar,
            ice,
            addons,
            quantity: 1,
            reason: getRecommendationReason(recommendedDrink),
            score: selectedMatch?.score || 0
        };
    }

    // Show dymanic order image in the recommendations results
    function renderQuizRecommendation() {
        if (!currentQuizRecommendation) return;

        quizQuestionViewEl.classList.add('hidden');
        quizResultViewEl.classList.remove('hidden');
        quizProgressTextEl.textContent = 'Recommendation ready';
        quizProgressBarEl.style.width = '100%';

        const { drink, sugar, ice, addons, reason } = currentQuizRecommendation;
        const includedAddons = getDefaultAddonsForDrink(drink);
        renderQuizRecommendationPreview(currentQuizRecommendation);
        quizResultDrinkNameEl.textContent = drink.name;
        quizResultReasonEl.textContent = reason;
        quizResultMetaEl.innerHTML = `
            <div>Category: ${drink.category}</div>
            <div>Sugar: ${sugar} | Ice: ${ice}</div>
            <div>${includedAddons.length ? `Included toppings: ${includedAddons.map((addon) => addon.name).join(', ')}` : 'Included toppings: none'}</div>
            <div>${addons.length ? `Suggested extras: ${addons.map((addon) => addon.name).join(', ')}` : 'Suggested extras: none'}</div>
        `;
    }

    function addQuizRecommendationToOrder() {
        if (!currentQuizRecommendation) return;

        const { drink, addons, sugar, ice, quantity: itemQuantity } = currentQuizRecommendation;
        order.push(buildOrderItemFromConfig(drink, addons, sugar, ice, itemQuantity));
        closeQuizOverlay();
        hideResultOverlay();
        renderOrder();
    }

    function customizeQuizRecommendation() {
        if (!currentQuizRecommendation) return;

        const { drink, addons, sugar, ice, quantity: itemQuantity } = currentQuizRecommendation;
        openCustomizeModal(
            drink,
            {
                addons,
                cubeAddonOrder: syncCubeOrderForAddons(addons, []),
                sugar,
                ice,
                quantity: itemQuantity
            },
            null
        );
        closeQuizOverlay();
    }

    function hideResultOverlay() {
        if (resultOverlayTimer) {
            clearTimeout(resultOverlayTimer);
            resultOverlayTimer = null;
        }

        resultOverlayEl.classList.add('hidden');
        resultCardEl.classList.remove('success', 'error', 'info');
        resultTitleEl.textContent = '';
        resultMessageEl.textContent = '';
        resultTicketEl.textContent = '';
        resultTicketEl.classList.add('hidden');
    }

    function showResultOverlay({ title, message, type = 'info', ticketNumber = null, autoDismissMs = null }) {
        if (resultOverlayTimer) {
            clearTimeout(resultOverlayTimer);
            resultOverlayTimer = null;
        }

        resultCardEl.classList.remove('success', 'error', 'info');
        resultCardEl.classList.add(type);
        resultTitleEl.textContent = title;
        resultMessageEl.textContent = message;

        if (ticketNumber) {
            resultTicketEl.textContent = `Ticket #${ticketNumber}`;
            resultTicketEl.classList.remove('hidden');
        } else {
            resultTicketEl.textContent = '';
            resultTicketEl.classList.add('hidden');
        }

        resultOverlayEl.classList.remove('hidden');

        if (autoDismissMs) {
            resultOverlayTimer = setTimeout(() => {
                hideResultOverlay();
            }, autoDismissMs);
        }
    }

    // ------------ Functions for "cart-my order" section ------------
    function getItemEditSummary(item) {
        const optionParts = [
            `Sugar: ${item.sugar}`,
            `Ice: ${item.ice}`
        ];

        const includedAddons = item.addons.filter((addon) => addon.included);
        const extraAddons = getChargeableAddons(item.addons);

        if (includedAddons.length > 0) {
            optionParts.push(`Included: ${includedAddons.map((addon) => translateName(addon.name)).join(', ')}`);
        }

        if (extraAddons.length > 0) {
            optionParts.push(`Extras: ${extraAddons.map((addon) => translateName(addon.name)).join(', ')}`);
        }

        return optionParts.join(' | ');
    }

    function updateOrderItemQuantity(index, nextQuantity) {
        if (!order[index]) return;

        order[index].quantity = Math.max(1, nextQuantity);
        order[index].total = getOrderItemTotal(
            { price: order[index].basePrice },
            order[index].addons,
            order[index].quantity
        );

        renderOrder();
    }

    function openOrderItemEditor(index) {
        const item = order[index];
        if (!item) return;

        openCustomizeModal(
            {
                id: item.drinkId,
                name: item.name,
                price: item.basePrice,
                defaultAddonIds: item.defaultAddonIds || []
            },
            item,
            index
        );
    }

    // Move the widget dock between the order and menu columns.
    function updateWidgetDockPosition() {
        if (!widgetDockEl || !menuColumnEl || !orderColumnEl) return;

        const targetColumn = order.length >= 2 ? menuColumnEl : orderColumnEl;
        if (widgetDockEl.parentElement !== targetColumn) {
            targetColumn.appendChild(widgetDockEl);
        }
    }

    function updateOrderActionState() {
        const hasItems = order.length > 0;
        clearOrderBtn.disabled = !hasItems;
        checkoutOrderBtn.disabled = !hasItems;
    }

    function renderOrder() {
        updateWidgetDockPosition();
        updateOrderActionState();

        if (order.length === 0) {
            orderListEl.innerHTML = '<div class="muted">Your order is empty</div>';
            orderTotalEl.textContent = '0.00';
            return;
        }

        orderListEl.innerHTML = '';
        let total = 0;

        order.forEach((item, index) => {
            total += item.total;
            const previewUrl = createOrderItemPreviewDataUrl(item);

            const div = document.createElement('div');
            div.className = 'order-item';
            div.innerHTML = `
                <button class="order-item-edit" type="button">
                    <div class="order-item-main">
                        ${previewUrl ? `<img class="order-item-thumb" src="${previewUrl}" alt="${item.name} preview">` : ''}
                        <div class="order-item-details">
                            <h3>${item.quantity} x ${translateName(item.name)}</h3>
                            <div class="order-item-copy">${getItemEditSummary(item)}</div>
                            <div class="order-item-price-row">
                                <strong>$${money(item.total)}</strong>
                                <span class="order-item-hint">Tap to edit</span>
                            </div>
                        </div>
                    </div>
                </button>
                <div class="order-item-actions">
                    <div class="qty-row cart-qty-row">
                        <span>Qty</span>
                        <button class="qty-btn order-qty-btn" type="button" data-action="decrease">-</button>
                        <strong>${item.quantity}</strong>
                        <button class="qty-btn order-qty-btn" type="button" data-action="increase">+</button>
                    </div>
                    <button class="cart-btn danger order-remove-btn" type="button">Remove</button>
                </div>
            `;

            div.querySelector('.order-item-edit').onclick = () => openOrderItemEditor(index);
            div.querySelector('[data-action="decrease"]').onclick = (event) => {
                event.stopPropagation();
                updateOrderItemQuantity(index, item.quantity - 1);
            };
            div.querySelector('[data-action="increase"]').onclick = (event) => {
                event.stopPropagation();
                updateOrderItemQuantity(index, item.quantity + 1);
            };
            div.querySelector('.order-remove-btn').onclick = (event) => {
                event.stopPropagation();
                removeOrderItem(index);
            };

            orderListEl.appendChild(div);
        });

        orderTotalEl.textContent = money(total);
    }

    function removeOrderItem(index) {
        order.splice(index, 1);
        renderOrder();
    }

    // --------------- Order confirmation overlay ---------------
    async function submitOrder() {
        if (order.length === 0) {
            showResultOverlay({
                title: 'Order not submitted',
                message: 'Your order is empty. Please add at least one drink before checking out.',
                type: 'error'
            });
            return;
        }

        const payload = { order };
        showResultOverlay({
            title: 'Submitting order...',
            message: 'Please wait while we send your order to the kitchen.',
            type: 'info'
        });

        try {
            const res = await fetch('/kiosk/submitOrder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok && data.success) {
                showResultOverlay({
                    title: 'Order confirmed',
                    message: 'Enjoy your boba!',
                    type: 'success',
                    ticketNumber: data.orderId || null,
                    autoDismissMs: 8000
                });
                order = [];
                renderOrder();
            } else {
                showResultOverlay({
                    title: 'Order not submitted',
                    message: data.message || 'Something went wrong while submitting your order. Please try again.',
                    type: 'error'
                });
            }
        } catch (err) {
            console.error(err);
            showResultOverlay({
                title: 'Connection problem',
                message: 'Unable to reach the server. Please try again.',
                type: 'error'
            });
        }
    }

    function bindEvents() {
        document.getElementById('minusQty').onclick = () => {
            if (quantity > 1) {
                quantity -= 1;
                renderQuantity();
                renderCustomizePrice();
            }
        };

        document.getElementById('plusQty').onclick = () => {
            quantity += 1;
            renderQuantity();
            renderCustomizePrice();
        };

        clearOrderBtn.onclick = () => {
            order = [];
            cancelCustomization();
            hideResultOverlay();
            renderOrder();
        };

        checkoutOrderBtn.onclick = submitOrder;
        openQuizWidgetBtn.onclick = openQuizOverlay;
        closeQuizBtn.onclick = closeQuizOverlay;
        retakeQuizBtn.onclick = openQuizOverlay;
        quizAddDrinkBtn.onclick = addQuizRecommendationToOrder;
        quizCustomizeDrinkBtn.onclick = customizeQuizRecommendation;
        resultOkBtn.onclick = hideResultOverlay;
        closeCustomizeBtn.onclick = cancelCustomization;
        cancelCustomizeBtn.onclick = cancelCustomization;
        saveCustomizeBtn.onclick = saveCustomization;
        quizOverlayEl.onclick = (event) => {
            if (event.target === quizOverlayEl) {
                closeQuizOverlay();
            }
        };
        customizeOverlay.onclick = (event) => {
            if (event.target === customizeOverlay) {
                cancelCustomization();
            }
        };
    }

    // Accessibility buttons unitlity
    function initAccessibilityControls() {
        const lens = document.getElementById('screenMagnifier');
        const lensContent = document.getElementById('screenMagnifierContent');
        const highContrastBtn = document.getElementById('highContrastBtn');
        const lowContrastBtn = document.getElementById('lowContrastBtn');
        const magnifierBtn = document.getElementById('magnifierBtn');
        const fontToggleBtn = document.getElementById('fontToggle');
        const translateToggleBtn = document.getElementById('translateToggleBtn');
        const translateTray = document.getElementById('translateTray');
        const zoom = 2;
        const lensSize = 220;
        let magnifierOn = false;

        window.googleTranslateElementInit = function googleTranslateElementInit() {
            new google.translate.TranslateElement({ pageLanguage: 'en' }, 'google_translate_element');
        };

        function setButtonActiveState(button, isActive) {
            if (!button) return;
            button.classList.toggle('is-active', isActive);
        }

        function updateContrastButtonStates() {
            setButtonActiveState(highContrastBtn, document.body.classList.contains('high-contrast'));
            setButtonActiveState(lowContrastBtn, document.body.classList.contains('low-contrast'));
        }

        function closeTranslateMenu() {
            translateTray.classList.remove('is-open');
            translateToggleBtn.setAttribute('aria-expanded', 'false');
            setButtonActiveState(translateToggleBtn, false);
        }

        window.toggleHighContrast = function toggleHighContrast() {
            const willEnable = !document.body.classList.contains('high-contrast');
            document.body.classList.toggle('high-contrast', willEnable);
            if (willEnable) {
                document.body.classList.remove('low-contrast');
            }
            updateContrastButtonStates();
        };

        window.toggleLowContrast = function toggleLowContrast() {
            const willEnable = !document.body.classList.contains('low-contrast');
            document.body.classList.toggle('low-contrast', willEnable);
            if (willEnable) {
                document.body.classList.remove('high-contrast');
            }
            updateContrastButtonStates();
        };

        window.toggleFontSize = function toggleFontSize() {
            const currentSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
            if (currentSize !== 20) {
                document.documentElement.style.fontSize = '20px';
                setButtonActiveState(fontToggleBtn, true);
            } else {
                document.documentElement.style.fontSize = `${originalSize}px`;
                setButtonActiveState(fontToggleBtn, false);
            }
        };

        window.toggleTranslateMenu = function toggleTranslateMenu() {
            const willOpen = !translateTray.classList.contains('is-open');
            if (!willOpen) {
                closeTranslateMenu();
                return;
            }

            translateTray.classList.add('is-open');
            translateToggleBtn.setAttribute('aria-expanded', 'true');
            setButtonActiveState(translateToggleBtn, true);
        };
        
        // Clone screen for magnifier utility
        function buildClone() {
            if (!magnifierOn) return;

            const clone = document.body.cloneNode(true);
            const pageWidth = Math.max(document.documentElement.clientWidth, window.innerWidth);
            const pageHeight = Math.max(
                document.documentElement.scrollHeight,
                document.body.scrollHeight,
                window.innerHeight
            );

            const oldLens = clone.querySelector('#screenMagnifier');
            if (oldLens) oldLens.remove();

            const clonedTranslateTray = clone.querySelector('#translateTray');
            if (clonedTranslateTray) clonedTranslateTray.remove();

            const clonedTranslateWidget = clone.querySelector('#google_translate_element');
            if (clonedTranslateWidget) clonedTranslateWidget.remove();

            clone.querySelectorAll('iframe').forEach((iframe) => iframe.remove());

            // Lock the clone to the real page size so it renders exactly like
            // the visible page instead of reflowing to the lens width.
            clone.style.width = `${pageWidth}px`;
            clone.style.minWidth = `${pageWidth}px`;
            clone.style.maxWidth = 'none';
            clone.style.margin = '0';

            lensContent.style.width = `${pageWidth}px`;
            lensContent.style.height = `${pageHeight}px`;

            lensContent.innerHTML = '';
            lensContent.appendChild(clone);
        }

        function updateMagnifier(event) {
            if (!magnifierOn) return;

            const mouseX = event.clientX;
            const mouseY = event.clientY;
            const pageX = event.pageX;
            const pageY = event.pageY;

            lens.style.display = 'block';
            lens.style.left = `${mouseX + 20}px`;
            lens.style.top = `${mouseY + 20}px`;

            lensContent.style.transform = `scale(${zoom})`;
            lensContent.style.left = `${-(pageX * zoom - lensSize / 2)}px`;
            lensContent.style.top = `${-(pageY * zoom - lensSize / 2)}px`;
        }

        function hideMagnifier() {
            lens.style.display = 'none';
        }

        document.addEventListener('mousemove', updateMagnifier);
        document.addEventListener('mouseleave', hideMagnifier);
        window.addEventListener('scroll', buildClone);
        window.addEventListener('resize', buildClone);
        setInterval(buildClone, 1000);

        window.toggleScreenMagnifier = function toggleScreenMagnifier() {
            magnifierOn = !magnifierOn;
            if (!magnifierOn) {
                lens.style.display = 'none';
                lensContent.innerHTML = '';
            } else {
                buildClone();
            }
            setButtonActiveState(magnifierBtn, magnifierOn);
        };

        updateContrastButtonStates();
        setButtonActiveState(fontToggleBtn, false);
        setButtonActiveState(magnifierBtn, false);
        setButtonActiveState(translateToggleBtn, false);
    }

    function init() {
        bindEvents();
        initAccessibilityControls();

        if (Object.keys(menuData.categories).length > 0) {
            renderTabs();
            renderMenu();
            renderAddons();
            renderQuantity();
            renderOrder();
        } else {
            document.querySelector('.section-title').textContent = 'No menu items available';
        }

        loadDrinkSvg();
    }

    init();
})();
