/**
 * HisaabKitab - Bill Splitter & Expense Sharing
 * Pure Vanilla JavaScript (ES6+)
 * 
 * Production Features:
 * 1. Zero external libraries/CDNs
 * 2. Group Note / Announcement Input with live broadcast & export
 * 3. Round-Up Share Toggle Button (rounds UP to whole numbers with surplus buffer tracking)
 * 4. Last 5 Calculated Bills History ('Recent Splits') with 1-click restore
 * 5. Text Receipt Download via native Blob & URL.createObjectURL
 * 6. Direct Mobile UPI Payment Deep-Link Integration
 * 7. Dynamic Custom Person Names with Two-Way Synchronization
 * 8. Light / Dark Theme toggle with CSS custom properties
 * 9. Global Multi-Currency Support (₹ INR, $ USD, € EUR, £ GBP)
 * 10. Floating-point safe 1-subunit exact balancing (0.00 discrepancy guaranteed)
 * 11. Strict error handling & zero-result rule on invalid inputs
 * 12. LocalStorage state & history synchronization
 */

(function () {
  'use strict';

  // --- STORAGE KEYS ---
  const STORAGE_KEY = 'hisaabkitab_v1_state';
  const HISTORY_KEY = 'hisaabkitab_v1_history';

  // --- CURRENCIES DEFINITION ---
  const CURRENCIES = {
    INR: { symbol: '₹', code: 'INR', name: 'Indian Rupee (₹)', locale: 'en-IN', subunit: 'Paisa' },
    USD: { symbol: '$', code: 'USD', name: 'US Dollar ($)', locale: 'en-US', subunit: 'Cent' },
    EUR: { symbol: '€', code: 'EUR', name: 'Euro (€)', locale: 'de-DE', subunit: 'Cent' },
    GBP: { symbol: '£', code: 'GBP', name: 'British Pound (£)', locale: 'en-GB', subunit: 'Penny' }
  };

  // --- SAMPLE NAMES LIST ---
  const SAMPLE_NAMES = [
    'Aarav', 'Priya', 'Rohan', 'Ananya', 'Kabir',
    'Isha', 'Vikram', 'Neha', 'Aditya', 'Sneha',
    'Arjun', 'Meera', 'Dev', 'Kavya', 'Siddharth'
  ];

  // --- DOM SELECTORS ---
  // Form Inputs
  const occasionInput = document.getElementById('occasionInput');
  const billInput = document.getElementById('billInput');
  const billCurrencyPrefix = document.getElementById('billCurrencyPrefix');
  const currencySelect = document.getElementById('currencySelect');
  const peopleInput = document.getElementById('peopleInput');
  const btnDecreasePeople = document.getElementById('btnDecreasePeople');
  const btnIncreasePeople = document.getElementById('btnIncreasePeople');
  const tipButtons = document.querySelectorAll('.tip-btn');
  const customTipInput = document.getElementById('customTipInput');
  const upiIdInput = document.getElementById('upiIdInput');
  const groupNoteInput = document.getElementById('groupNoteInput');

  // Custom Person Names Box
  const personInputsGrid = document.getElementById('personInputsGrid');
  const btnFillSampleNames = document.getElementById('btnFillSampleNames');
  const btnClearNames = document.getElementById('btnClearNames');

  // Action Buttons
  const btnCalculate = document.getElementById('btnCalculate');
  const btnReset = document.getElementById('btnReset');
  const btnCopy = document.getElementById('btnCopy');
  const btnShare = document.getElementById('btnShare');
  const btnDownloadReceipt = document.getElementById('btnDownloadReceipt');

  // Round-Up Share Controls
  const btnRoundUp = document.getElementById('btnRoundUp');
  const roundUpLabel = document.getElementById('roundUpLabel');
  const roundUpSurplusTag = document.getElementById('roundUpSurplusTag');

  // Group Note Display
  const groupNoteBanner = document.getElementById('groupNoteBanner');
  const displayGroupNote = document.getElementById('displayGroupNote');

  // UPI Box Elements
  const upiActionBox = document.getElementById('upiActionBox');
  const upiIdBadge = document.getElementById('upiIdBadge');
  const btnUpiPay = document.getElementById('btnUpiPay');
  const btnCopyUpi = document.getElementById('btnCopyUpi');

  // Error & Result Containers
  const errorBanner = document.getElementById('errorBanner');
  const errorMessage = document.getElementById('errorMessage');
  const resultsCard = document.getElementById('resultsCard');
  const emptyState = document.getElementById('emptyState');

  // Result Displays
  const displayOccasion = document.getElementById('displayOccasion');
  const displayPerPerson = document.getElementById('displayPerPerson');
  const displayPerPersonCurrency = document.getElementById('displayPerPersonCurrency');
  const displayTotalBill = document.getElementById('displayTotalBill');
  const displayTipAmount = document.getElementById('displayTipAmount');
  const displayGrandTotal = document.getElementById('displayGrandTotal');
  const sharesList = document.getElementById('sharesList');
  const sharesCountPill = document.getElementById('sharesCountPill');

  // Exact Sum Verification Displays
  const verifySum = document.getElementById('verifySum');
  const verifyTarget = document.getElementById('verifyTarget');
  const verifyDiff = document.getElementById('verifyDiff');
  const verifyStatusText = document.getElementById('verifyStatusText');
  const verificationBadge = document.getElementById('verificationBadge');

  // Recent Splits History
  const recentSplitsGrid = document.getElementById('recentSplitsGrid');
  const historyCountBadge = document.getElementById('historyCountBadge');
  const btnClearHistory = document.getElementById('btnClearHistory');

  // Navigation & Drawer
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerOverlay = document.getElementById('drawerOverlay');
  const navResetBtns = document.querySelectorAll('.nav-link-reset, .drawer-link-reset');

  // Theme Toggles
  const themeToggleDesktop = document.getElementById('themeToggleDesktop');
  const themeToggleMobile = document.getElementById('themeToggleMobile');
  const themeLabelDesktop = document.getElementById('themeLabelDesktop');
  const themeLabelMobile = document.getElementById('themeLabelMobile');
  const themeIconDesktop = document.getElementById('themeIconDesktop');
  const themeIconMobile = document.getElementById('themeIconMobile');

  // Modals & Toasts
  const helpModal = document.getElementById('helpModal');
  const featuresModal = document.getElementById('featuresModal');
  const modalCloseBtns = document.querySelectorAll('.modal-close-btn');
  const openHelpBtns = document.querySelectorAll('[data-open-help]');
  const openFeaturesBtns = document.querySelectorAll('[data-open-features]');
  const toastNotice = document.getElementById('toastNotice');
  const presetChips = document.querySelectorAll('.chip-btn[data-preset]');

  // --- INTERNAL STATE ---
  let appState = {
    occasion: '',
    bill: '',
    people: 2,
    tipPercent: 10,
    isCustomTip: false,
    customTipVal: '',
    upiId: '',
    groupNote: '',
    roundUp: false,
    personNames: {}, // Key: 'p_1', 'p_2', ...
    currency: 'INR', // 'INR', 'USD', 'EUR', 'GBP'
    theme: 'dark', // 'dark', 'light'
    hasCalculated: false
  };

  // --- UTILITY FUNCTIONS ---

  function round2(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  function formatCurrency(val, currencyKey) {
    const key = currencyKey || appState.currency;
    const curr = CURRENCIES[key] || CURRENCIES.INR;
    const num = round2(val);
    return num.toLocaleString(curr.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function getActiveCurrency() {
    return CURRENCIES[appState.currency] || CURRENCIES.INR;
  }

  let toastTimer = null;
  function showToast(text) {
    if (!toastNotice) return;
    toastNotice.querySelector('.toast-text').textContent = text;
    toastNotice.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastNotice.classList.remove('show');
    }, 2500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDateForReceipt(dateObj = new Date()) {
    const options = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    return dateObj.toLocaleString('en-IN', options);
  }

  // --- THEME MANAGEMENT ---

  const SUN_ICON_SVG = `
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  `;

  const MOON_ICON_SVG = `
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  `;

  function applyTheme(theme) {
    appState.theme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', appState.theme);

    const isLight = appState.theme === 'light';

    if (themeIconDesktop) {
      themeIconDesktop.innerHTML = isLight ? MOON_ICON_SVG : SUN_ICON_SVG;
    }
    if (themeIconMobile) {
      themeIconMobile.innerHTML = isLight ? MOON_ICON_SVG : SUN_ICON_SVG;
    }

    if (themeLabelDesktop) {
      themeLabelDesktop.textContent = isLight ? 'Dark' : 'Light';
    }
    if (themeLabelMobile) {
      themeLabelMobile.textContent = isLight ? 'Switch to Dark' : 'Switch to Light';
    }

    saveState();
  }

  function toggleTheme() {
    const nextTheme = appState.theme === 'light' ? 'dark' : 'light';
    applyTheme(nextTheme);
    showToast(`Switched to ${nextTheme === 'light' ? 'Light' : 'Dark'} Mode`);
  }

  // --- CURRENCY MANAGEMENT ---

  function applyCurrency(code, triggerRecalc = true) {
    const curr = CURRENCIES[code] || CURRENCIES.INR;
    appState.currency = curr.code;

    if (currencySelect) {
      currencySelect.value = curr.code;
    }

    if (billCurrencyPrefix) {
      billCurrencyPrefix.textContent = curr.symbol;
    }

    document.querySelectorAll('.currency-symbol-tag').forEach((el) => {
      el.textContent = curr.symbol;
    });

    if (displayPerPersonCurrency) {
      displayPerPersonCurrency.textContent = curr.symbol;
    }

    if (verificationBadge) {
      verificationBadge.textContent = `0 ${curr.subunit} Discrepancy`;
    }

    if (triggerRecalc && appState.hasCalculated) {
      calculateSplit(false, false);
    }

    saveState();
  }

  // --- ROUND-UP SHARES TOGGLE ---

  function toggleRoundUp() {
    appState.roundUp = !appState.roundUp;
    updateRoundUpUI();
    if (appState.hasCalculated) {
      calculateSplit(false, false);
    }
    showToast(`Round Up: ${appState.roundUp ? 'ON' : 'OFF'}`);
    saveState();
  }

  function updateRoundUpUI() {
    if (!btnRoundUp || !roundUpLabel) return;
    if (appState.roundUp) {
      btnRoundUp.classList.add('active');
      btnRoundUp.setAttribute('aria-pressed', 'true');
      roundUpLabel.textContent = 'Round Up: ON';
    } else {
      btnRoundUp.classList.remove('active');
      btnRoundUp.setAttribute('aria-pressed', 'false');
      roundUpLabel.textContent = 'Round Up: OFF';
    }
  }

  // --- CUSTOM PERSON NAMES DYNAMIC GENERATOR ---

  function renderPersonInputs() {
    if (!personInputsGrid) return;

    const peopleCount = parseInt(peopleInput.value, 10) || 1;
    personInputsGrid.innerHTML = '';

    for (let i = 1; i <= peopleCount; i++) {
      const key = `p_${i}`;
      const savedName = appState.personNames[key] || '';

      const fieldWrapper = document.createElement('div');
      fieldWrapper.className = 'person-input-field';
      fieldWrapper.style.animationDelay = `${(i - 1) * 0.035}s`;

      fieldWrapper.innerHTML = `
        <span class="person-input-badge">${i}</span>
        <input 
          type="text" 
          class="person-config-input" 
          data-person-index="${i}" 
          placeholder="Person ${i}" 
          value="${escapeHtml(savedName)}"
          maxlength="30"
          aria-label="Name for Person ${i}"
        />
      `;

      const input = fieldWrapper.querySelector('.person-config-input');
      input.addEventListener('input', (e) => {
        const idx = e.target.dataset.personIndex;
        const val = e.target.value.trim();
        appState.personNames[`p_${idx}`] = val;

        if (appState.hasCalculated) {
          updateSharesDisplayNames();
        }
        saveState();
      });

      personInputsGrid.appendChild(fieldWrapper);
    }
  }

  function fillSampleNames() {
    const peopleCount = parseInt(peopleInput.value, 10) || 1;
    for (let i = 1; i <= peopleCount; i++) {
      const sample = SAMPLE_NAMES[(i - 1) % SAMPLE_NAMES.length];
      appState.personNames[`p_${i}`] = sample;
    }
    renderPersonInputs();
    if (appState.hasCalculated) {
      calculateSplit(false, false);
    }
    saveState();
    showToast('Loaded sample person names');
  }

  function clearAllPersonNames() {
    appState.personNames = {};
    renderPersonInputs();
    if (appState.hasCalculated) {
      calculateSplit(false, false);
    }
    saveState();
    showToast('Reset names to default');
  }

  function updateSharesDisplayNames() {
    const rows = sharesList.querySelectorAll('.person-row');
    rows.forEach((row) => {
      const input = row.querySelector('.person-name-input');
      if (input) {
        const key = input.dataset.personKey;
        const fallback = `Person ${key.replace('p_', '')}`;
        input.value = appState.personNames[key] || fallback;
      }
    });
  }

  // --- ERROR HANDLING & ZERO-RESULT RULE ---

  function clearErrors() {
    if (errorBanner) {
      errorBanner.classList.remove('visible');
    }
    billInput.classList.remove('error');
    peopleInput.classList.remove('error');
  }

  function showError(msg, invalidField) {
    if (errorBanner && errorMessage) {
      errorMessage.textContent = msg;
      errorBanner.classList.add('visible');
    }

    if (invalidField === 'bill') {
      billInput.classList.add('error');
      peopleInput.classList.remove('error');
    } else if (invalidField === 'people') {
      peopleInput.classList.add('error');
      billInput.classList.remove('error');
    } else if (invalidField === 'both') {
      billInput.classList.add('error');
      peopleInput.classList.add('error');
    }

    // MANDATORY ZERO-RESULT RULE:
    // Completely hide results card on invalid inputs
    resultsCard.classList.add('hidden');
    if (emptyState) {
      emptyState.classList.remove('zero-result-hidden');
    }

    appState.hasCalculated = false;
    saveState();
  }

  // --- CORE CALCULATION ENGINE ---

  /**
   * Calculate shares with 1-subunit exact sum guarantee & optional Round-Up
   */
  function calculateSplit(explicitClick = false, pushToHistory = true) {
    const billStr = billInput.value.trim();
    const peopleStr = peopleInput.value.trim();

    // 1. Validation checks
    const billNum = parseFloat(billStr);
    const peopleNum = parseInt(peopleStr, 10);

    const isBillInvalid = isNaN(billNum) || billNum <= 0;
    const isPeopleInvalid = isNaN(peopleNum) || peopleNum <= 0;

    if (isBillInvalid && isPeopleInvalid) {
      showError('Please enter a valid bill amount (greater than 0) and number of people (at least 1).', 'both');
      return false;
    }

    if (isBillInvalid) {
      showError('Please enter a valid bill amount greater than 0.', 'bill');
      return false;
    }

    if (isPeopleInvalid) {
      showError('Please enter a valid number of people (must be 1 or more).', 'people');
      return false;
    }

    // 2. Clear any errors
    clearErrors();

    const curr = getActiveCurrency();

    // 3. Tip calculation
    let tipPercent = 0;
    if (appState.isCustomTip) {
      const customVal = parseFloat(customTipInput.value);
      tipPercent = !isNaN(customVal) && customVal >= 0 ? customVal : 0;
    } else {
      tipPercent = appState.tipPercent >= 0 ? appState.tipPercent : 0;
    }

    const tipAmount = round2(billNum * (tipPercent / 100));
    const grandTotal = round2(billNum + tipAmount);

    // 4. Exact Sum 1-Subunit Allocation Algorithm
    const totalSubunits = Math.round(grandTotal * 100);
    const baseSubunitsPerPerson = Math.floor(totalSubunits / peopleNum);
    const remainderSubunits = totalSubunits % peopleNum;

    const baseShares = [];
    let sumSubunitsCheck = 0;

    for (let i = 0; i < peopleNum; i++) {
      const hasRoundingAdjustment = i < remainderSubunits;
      const personSubunits = hasRoundingAdjustment ? baseSubunitsPerPerson + 1 : baseSubunitsPerPerson;
      const personShare = round2(personSubunits / 100);

      sumSubunitsCheck += personSubunits;

      const personKey = `p_${i + 1}`;
      const customName = appState.personNames[personKey] || `Person ${i + 1}`;

      baseShares.push({
        id: i + 1,
        key: personKey,
        name: customName,
        exactAmount: personShare,
        amount: personShare,
        adjusted: hasRoundingAdjustment,
        roundUpExtra: 0
      });
    }

    const calculatedSum = round2(sumSubunitsCheck / 100);
    const discrepancy = round2(Math.abs(calculatedSum - grandTotal));
    let averagePerPerson = round2(grandTotal / peopleNum);

    // 5. Round-Up Logic (if activated)
    let totalCollected = calculatedSum;
    let roundUpSurplus = 0;

    if (appState.roundUp) {
      let roundedTotalSum = 0;
      baseShares.forEach((person) => {
        const roundedWhole = Math.ceil(person.exactAmount);
        const extra = round2(roundedWhole - person.exactAmount);
        person.amount = roundedWhole;
        person.roundUpExtra = extra;
        roundedTotalSum = round2(roundedTotalSum + roundedWhole);
      });

      totalCollected = roundedTotalSum;
      roundUpSurplus = round2(totalCollected - grandTotal);
      averagePerPerson = Math.ceil(averagePerPerson);

      if (roundUpSurplusTag) {
        roundUpSurplusTag.textContent = `+${curr.symbol}${formatCurrency(roundUpSurplus)} kitty pool`;
        roundUpSurplusTag.classList.add('visible');
      }
    } else {
      if (roundUpSurplusTag) {
        roundUpSurplusTag.classList.remove('visible');
      }
    }

    // 6. Update UI DOM Elements
    displayOccasion.textContent = occasionInput.value.trim() || 'General Bill';
    displayPerPersonCurrency.textContent = curr.symbol;
    displayPerPerson.textContent = formatCurrency(averagePerPerson);
    displayTotalBill.textContent = `${curr.symbol}${formatCurrency(billNum)}`;
    displayTipAmount.textContent = `${curr.symbol}${formatCurrency(tipAmount)} (${tipPercent}%)`;
    displayGrandTotal.textContent = `${curr.symbol}${formatCurrency(grandTotal)}`;

    sharesCountPill.textContent = `${peopleNum} ${peopleNum === 1 ? 'person' : 'people'}`;

    // Render individual shares
    sharesList.innerHTML = '';
    baseShares.forEach((person) => {
      const row = document.createElement('div');
      row.className = 'person-row';

      let tagHtml = '';
      if (appState.roundUp && person.roundUpExtra > 0) {
        tagHtml = `<span class="rounding-tag" title="Rounded UP to whole integer">+${curr.symbol}${formatCurrency(person.roundUpExtra)} round-up</span>`;
      } else if (person.adjusted && !appState.roundUp) {
        tagHtml = `<span class="rounding-tag" title="1-${curr.subunit.toLowerCase()} balancing adjustment applied">+${curr.symbol}0.01 rounded</span>`;
      }

      row.innerHTML = `
        <div class="person-left">
          <div class="person-avatar">${person.id}</div>
          <input 
            type="text" 
            class="person-name-input" 
            value="${escapeHtml(person.name)}" 
            data-person-key="${person.key}" 
            aria-label="Name for ${escapeHtml(person.name)}"
            title="Edit name in breakdown"
          />
        </div>
        <div class="person-amount-box">
          ${tagHtml}
          <div class="person-amount">${curr.symbol}${formatCurrency(person.amount)}</div>
        </div>
      `;
      sharesList.appendChild(row);
    });

    // Two-way sync: editing in result row updates the config inputs
    const resultNameInputs = sharesList.querySelectorAll('.person-name-input');
    resultNameInputs.forEach((input) => {
      input.addEventListener('input', (e) => {
        const key = e.target.dataset.personKey;
        const val = e.target.value.trim();
        appState.personNames[key] = val;

        const leftInput = personInputsGrid.querySelector(`[data-person-index="${key.replace('p_', '')}"]`);
        if (leftInput) {
          leftInput.value = val;
        }
        saveState();
      });
    });

    // 7. Update Group Note Banner
    const noteText = (groupNoteInput.value || '').trim();
    appState.groupNote = noteText;
    if (noteText && groupNoteBanner && displayGroupNote) {
      displayGroupNote.textContent = noteText;
      groupNoteBanner.style.display = 'flex';
    } else if (groupNoteBanner) {
      groupNoteBanner.style.display = 'none';
    }

    // 8. Update Exact Sum Verification Box
    if (appState.roundUp) {
      verifySum.textContent = `${curr.symbol}${formatCurrency(totalCollected)}`;
      verifyTarget.textContent = `${curr.symbol}${formatCurrency(grandTotal)}`;
      verifyDiff.textContent = `+${curr.symbol}${formatCurrency(roundUpSurplus)}`;
      verifyStatusText.textContent = `Round-Up Active (+${curr.symbol}${formatCurrency(roundUpSurplus)} Kitty Pool)`;
      if (verificationBadge) {
        verificationBadge.textContent = 'Whole Integer Round-Up';
      }
    } else {
      verifySum.textContent = `${curr.symbol}${formatCurrency(calculatedSum)}`;
      verifyTarget.textContent = `${curr.symbol}${formatCurrency(grandTotal)}`;
      verifyDiff.textContent = `${curr.symbol}${formatCurrency(discrepancy)}`;

      if (discrepancy === 0) {
        verifyStatusText.textContent = 'Exact 100% Balanced Match';
      } else {
        verifyStatusText.textContent = `Difference: ${curr.symbol}${formatCurrency(discrepancy)}`;
      }

      if (verificationBadge) {
        verificationBadge.textContent = `0 ${curr.subunit} Discrepancy`;
      }
    }

    // 9. Update UPI Payment Deep-Link
    const upiId = (upiIdInput.value || '').trim();
    appState.upiId = upiId;

    if (upiId && upiActionBox) {
      upiActionBox.style.display = 'flex';
      if (upiIdBadge) {
        upiIdBadge.textContent = upiId;
      }

      const upiCurrency = appState.currency === 'INR' ? 'INR' : appState.currency;
      const cleanOccasion = (occasionInput.value || 'HisaabKitab Split').trim();
      const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=HisaabKitab&am=${averagePerPerson.toFixed(2)}&cu=${upiCurrency}&tn=${encodeURIComponent(cleanOccasion)}`;

      if (btnUpiPay) {
        btnUpiPay.href = upiUri;
      }
    } else if (upiActionBox) {
      upiActionBox.style.display = 'none';
    }

    // 10. Reveal results card & hide empty state
    resultsCard.classList.remove('hidden');
    if (emptyState) {
      emptyState.classList.add('zero-result-hidden');
    }

    appState.hasCalculated = true;
    saveState();

    // 11. Save to Recent Splits History
    if (explicitClick && pushToHistory) {
      recordRecentSplit({
        occasion: occasionInput.value.trim() || 'General Bill',
        bill: billStr,
        people: peopleNum,
        tipPercent: tipPercent,
        isCustomTip: appState.isCustomTip,
        customTipVal: appState.customTipVal,
        upiId: upiId,
        groupNote: noteText,
        roundUp: appState.roundUp,
        personNames: Object.assign({}, appState.personNames),
        currency: appState.currency,
        grandTotal: grandTotal,
        perPerson: averagePerPerson,
        timestamp: Date.now(),
        dateFormatted: formatDateForReceipt()
      });
    }

    if (explicitClick && window.innerWidth <= 768) {
      resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    return true;
  }

  // --- RECENT SPLITS HISTORY MANAGEMENT ---

  function getRecentSplits() {
    try {
      const data = localStorage.getItem(HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Error reading history from localStorage', e);
      return [];
    }
  }

  function recordRecentSplit(record) {
    let history = getRecentSplits();

    history = history.filter((item) => {
      const isSameBill = item.bill === record.bill && item.people === record.people && item.occasion === record.occasion;
      return !isSameBill;
    });

    history.unshift(record);

    if (history.length > 5) {
      history = history.slice(0, 5);
    }

    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Error saving history to localStorage', e);
    }

    renderRecentSplitsUI();
  }

  function renderRecentSplitsUI() {
    if (!recentSplitsGrid) return;

    const history = getRecentSplits();

    if (historyCountBadge) {
      historyCountBadge.textContent = `${history.length} / 5`;
    }

    if (history.length === 0) {
      recentSplitsGrid.innerHTML = `
        <div class="history-empty-state">
          No recent splits calculated yet. Complete a bill split above to store it here.
        </div>
      `;
      return;
    }

    recentSplitsGrid.innerHTML = '';

    history.forEach((item) => {
      const curr = CURRENCIES[item.currency] || CURRENCIES.INR;
      const card = document.createElement('div');
      card.className = 'history-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Restore split for ${escapeHtml(item.occasion)}`);

      card.innerHTML = `
        <div class="history-card-header">
          <span class="history-occasion" title="${escapeHtml(item.occasion)}">${escapeHtml(item.occasion)}</span>
          <span class="history-date">${escapeHtml(item.dateFormatted || 'Recent')}</span>
        </div>
        <div class="history-meta-row">
          <span class="history-total">${curr.symbol}${formatCurrency(item.grandTotal, item.currency)}</span>
          <span class="history-people">${item.people} ${item.people === 1 ? 'person' : 'people'}</span>
        </div>
        <div class="history-restore-hint">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
          <span>Click to restore bill</span>
        </div>
      `;

      card.addEventListener('click', () => {
        restoreSplitFromHistory(item);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          restoreSplitFromHistory(item);
        }
      });

      recentSplitsGrid.appendChild(card);
    });
  }

  function restoreSplitFromHistory(item) {
    occasionInput.value = item.occasion || '';
    billInput.value = item.bill || '';
    peopleInput.value = item.people || 2;
    upiIdInput.value = item.upiId || '';
    groupNoteInput.value = item.groupNote || '';

    appState.isCustomTip = Boolean(item.isCustomTip);
    appState.tipPercent = typeof item.tipPercent === 'number' ? item.tipPercent : 10;
    appState.customTipVal = item.customTipVal || '';
    customTipInput.value = item.customTipVal || '';

    appState.roundUp = Boolean(item.roundUp);
    updateRoundUpUI();

    appState.personNames = Object.assign({}, item.personNames || {});

    applyCurrency(item.currency || 'INR', false);
    renderPersonInputs();
    updateTipSelectionUI();

    calculateSplit(true, false);

    showToast(`Restored: "${item.occasion || 'Recent Split'}"`);

    const calcSection = document.getElementById('calculator');
    if (calcSection) {
      calcSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function clearHistory() {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (e) {
      console.warn('Error clearing history', e);
    }
    renderRecentSplitsUI();
    showToast('Recent splits history cleared');
  }

  // --- DOWNLOAD RECEIPT AS .TXT FILE ---

  function downloadReceipt() {
    const billStr = billInput.value.trim();
    const peopleStr = peopleInput.value.trim();

    if (!billStr || !peopleStr || resultsCard.classList.contains('hidden')) {
      showToast('Calculate a valid bill first!');
      return;
    }

    const curr = getActiveCurrency();
    const occasion = occasionInput.value.trim() || 'General Bill';
    const billFormatted = displayTotalBill.textContent;
    const tipFormatted = displayTipAmount.textContent;
    const grandTotal = displayGrandTotal.textContent;
    const perPerson = displayPerPerson.textContent;
    const people = peopleStr;
    const upiId = upiIdInput.value.trim();
    const groupNote = groupNoteInput.value.trim();
    const dateTimeStr = formatDateForReceipt();

    // Build Individual Shares Lines
    const personRows = sharesList.querySelectorAll('.person-row');
    const personLines = [];
    personRows.forEach((row, idx) => {
      const name = row.querySelector('.person-name-input').value.trim() || `Person ${idx + 1}`;
      const amount = row.querySelector('.person-amount').textContent;
      const tag = row.querySelector('.rounding-tag') ? ' (rounded)' : '';
      personLines.push(`  ${String(idx + 1).padStart(2, ' ')}. ${name.padEnd(20, ' ')} : ${amount}${tag}`);
    });

    const divider = '============================================================';
    const subDivider = '------------------------------------------------------------';

    const receiptContent = [
      divider,
      '                  HISAABKITAB EXPENSE RECEIPT',
      '             Smart, Fast & Exact Bill Splitter',
      divider,
      `Occasion / Title : ${occasion}`,
      `Date & Time      : ${dateTimeStr}`,
      `Currency         : ${curr.name}`,
      upiId ? `UPI Payment ID   : ${upiId}` : null,
      groupNote ? `Group Note       : "${groupNote}"` : null,
      subDivider,
      `Base Bill Amount : ${billFormatted}`,
      `Tip / Svc Charge : ${tipFormatted}`,
      `Grand Total      : ${grandTotal}`,
      `Party Size       : ${people} ${people === '1' ? 'person' : 'people'}`,
      `Share Per Person : ${curr.symbol}${perPerson} ${appState.roundUp ? '(Rounded Up)' : '(Average)'}`,
      subDivider,
      'INDIVIDUAL SHARES BREAKDOWN:',
      personLines.join('\n'),
      subDivider,
      'EXACT SUM VERIFICATION:',
      `  Sum of Shares  : ${verifySum.textContent}`,
      `  Target Total   : ${verifyTarget.textContent}`,
      `  Variance / Pool: ${verifyDiff.textContent} (${appState.roundUp ? 'Surplus Buffer Kitty' : '100% Balanced Match'})`,
      upiId ? `\nUPI Payment Link : upi://pay?pa=${encodeURIComponent(upiId)}&pn=HisaabKitab&am=${parseFloat(perPerson.replace(/,/g, '')).toFixed(2)}&cu=${curr.code}&tn=${encodeURIComponent(occasion)}` : null,
      divider,
      '     Thank you for splitting fairly with HisaabKitab!',
      divider
    ].filter(Boolean).join('\n');

    try {
      const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
      const objectUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');

      downloadLink.href = objectUrl;
      downloadLink.download = `HisaabKitab_Receipt.txt`;
      document.body.appendChild(downloadLink);
      downloadLink.click();

      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(objectUrl);

      showToast('Receipt downloaded (HisaabKitab_Receipt.txt)');
    } catch (err) {
      console.error('Receipt download error', err);
      showToast('Error downloading receipt');
    }
  }

  // --- LOCALSTORAGE PERSISTENCE ---

  function saveState() {
    appState.occasion = occasionInput.value;
    appState.bill = billInput.value;
    appState.people = parseInt(peopleInput.value, 10) || 1;
    appState.customTipVal = customTipInput.value;
    appState.upiId = upiIdInput.value;
    appState.groupNote = groupNoteInput.value;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch (e) {
      console.warn('LocalStorage unavailable or quota exceeded', e);
    }
  }

  function restoreState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        applyTheme('dark');
        applyCurrency('INR', false);
        updateRoundUpUI();
        renderPersonInputs();
        renderRecentSplitsUI();
        return;
      }

      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== 'object') return;

      appState = {
        occasion: parsed.occasion || '',
        bill: parsed.bill || '',
        people: typeof parsed.people === 'number' && parsed.people > 0 ? parsed.people : 2,
        tipPercent: typeof parsed.tipPercent === 'number' ? parsed.tipPercent : 10,
        isCustomTip: Boolean(parsed.isCustomTip),
        customTipVal: parsed.customTipVal || '',
        upiId: parsed.upiId || '',
        groupNote: parsed.groupNote || '',
        roundUp: Boolean(parsed.roundUp),
        personNames: parsed.personNames || {},
        currency: parsed.currency && CURRENCIES[parsed.currency] ? parsed.currency : 'INR',
        theme: parsed.theme === 'light' ? 'light' : 'dark',
        hasCalculated: Boolean(parsed.hasCalculated)
      };

      // Populate input fields
      occasionInput.value = appState.occasion;
      billInput.value = appState.bill;
      peopleInput.value = appState.people;
      customTipInput.value = appState.customTipVal;
      upiIdInput.value = appState.upiId;
      groupNoteInput.value = appState.groupNote;

      applyTheme(appState.theme);
      applyCurrency(appState.currency, false);
      updateRoundUpUI();
      renderPersonInputs();
      updateTipSelectionUI();
      renderRecentSplitsUI();

      if (appState.bill && appState.people && appState.hasCalculated) {
        calculateSplit(false, false);
      }
    } catch (e) {
      console.warn('Error reading saved state from localStorage', e);
    }
  }

  function updateTipSelectionUI() {
    if (appState.isCustomTip) {
      tipButtons.forEach((btn) => btn.classList.remove('active'));
      if (customTipInput.value === '' && appState.customTipVal) {
        customTipInput.value = appState.customTipVal;
      }
    } else {
      customTipInput.value = '';
      tipButtons.forEach((btn) => {
        const tipVal = parseFloat(btn.dataset.tip);
        if (tipVal === appState.tipPercent) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }
  }

  // --- RESET HANDLER ---

  function resetApp() {
    occasionInput.value = '';
    billInput.value = '';
    peopleInput.value = '2';
    customTipInput.value = '';
    upiIdInput.value = '';
    groupNoteInput.value = '';

    const currentTheme = appState.theme;
    const currentCurrency = appState.currency;

    appState = {
      occasion: '',
      bill: '',
      people: 2,
      tipPercent: 10,
      isCustomTip: false,
      customTipVal: '',
      upiId: '',
      groupNote: '',
      roundUp: false,
      personNames: {},
      currency: currentCurrency,
      theme: currentTheme,
      hasCalculated: false
    };

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Error clearing localStorage', e);
    }

    clearErrors();
    updateRoundUpUI();
    if (roundUpSurplusTag) {
      roundUpSurplusTag.classList.remove('visible');
    }
    updateTipSelectionUI();
    renderPersonInputs();
    resultsCard.classList.add('hidden');
    if (upiActionBox) {
      upiActionBox.style.display = 'none';
    }
    if (groupNoteBanner) {
      groupNoteBanner.style.display = 'none';
    }
    if (emptyState) {
      emptyState.classList.remove('zero-result-hidden');
    }

    showToast('HisaabKitab reset successfully');
  }

  // --- COPY & SHARE BREAKDOWN ---

  function getFormattedBreakdownText() {
    const occasion = occasionInput.value.trim() || 'General Bill';
    const bill = billInput.value.trim();
    const people = peopleInput.value.trim();

    if (!bill || !people || resultsCard.classList.contains('hidden')) {
      showToast('Calculate a valid bill first!');
      return null;
    }

    const curr = getActiveCurrency();
    const grandTotal = displayGrandTotal.textContent;
    const billFormatted = displayTotalBill.textContent;
    const tipFormatted = displayTipAmount.textContent;
    const perPerson = displayPerPerson.textContent;
    const upiId = upiIdInput.value.trim();
    const groupNote = groupNoteInput.value.trim();

    const personRows = sharesList.querySelectorAll('.person-row');
    const personLines = [];
    personRows.forEach((row) => {
      const name = row.querySelector('.person-name-input').value.trim();
      const amount = row.querySelector('.person-amount').textContent;
      const tag = row.querySelector('.rounding-tag') ? ' (rounded)' : '';
      personLines.push(`  • ${name}: ${amount}${tag}`);
    });

    return [
      `🧾 *HisaabKitab Bill Breakdown*`,
      `📍 *Occasion:* ${occasion}`,
      groupNote ? `📢 *Note:* "${groupNote}"` : null,
      `──────────────────────────`,
      `💵 Base Bill: ${billFormatted}`,
      `🏷️ Tip / Service: ${tipFormatted}`,
      `✨ Grand Total: ${grandTotal}`,
      `👥 Split Among: ${people} ${people === '1' ? 'person' : 'people'} (Avg: ${curr.symbol}${perPerson}${appState.roundUp ? ' [Round-Up]' : ''})`,
      upiId ? `📱 UPI ID: ${upiId}` : null,
      `──────────────────────────`,
      `*Individual Shares:*`,
      personLines.join('\n'),
      `──────────────────────────`,
      appState.roundUp 
        ? `✅ Total Collected: ${verifySum.textContent} (${verifyDiff.textContent} kitty pool)`
        : `✅ Exact Sum Verified: ${grandTotal} (0.00 discrepancy)`,
      `⚡ Split with HisaabKitab: Smart & Fast Bill Splitter`
    ].filter(Boolean).join('\n');
  }

  function copyBreakdown() {
    const summaryText = getFormattedBreakdownText();
    if (!summaryText) return;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(summaryText).then(() => {
        onCopiedSuccess(btnCopy, 'Breakdown copied to clipboard!');
      }).catch(() => {
        fallbackCopyText(summaryText, 'Breakdown copied to clipboard!');
      });
    } else {
      fallbackCopyText(summaryText, 'Breakdown copied to clipboard!');
    }
  }

  async function shareBreakdown() {
    const summaryText = getFormattedBreakdownText();
    if (!summaryText) return;

    const occasion = occasionInput.value.trim() || 'General Bill';
    const shareTitle = `HisaabKitab Split: ${occasion}`;

    // Native Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: summaryText
        });
        showToast('Shared successfully!');
      } catch (err) {
        // If user cancelled, don't trigger fallback error
        if (err.name !== 'AbortError') {
          console.warn('Native share failed, falling back to clipboard', err);
          if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(summaryText).then(() => {
              onCopiedSuccess(btnShare, 'Copied summary to clipboard!');
            }).catch(() => {
              fallbackCopyText(summaryText, 'Copied summary to clipboard!');
            });
          } else {
            fallbackCopyText(summaryText, 'Copied summary to clipboard!');
          }
        }
      }
    } else {
      // Fallback smoothly to copying to clipboard
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(summaryText).then(() => {
          onCopiedSuccess(btnShare, 'Copied summary to clipboard!');
        }).catch(() => {
          fallbackCopyText(summaryText, 'Copied summary to clipboard!');
        });
      } else {
        fallbackCopyText(summaryText, 'Copied summary to clipboard!');
      }
    }
  }

  function fallbackCopyText(text, successMsg = 'Breakdown copied to clipboard!') {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        showToast(successMsg);
      } else {
        showToast('Unable to copy automatically');
      }
    } catch (err) {
      showToast('Copy failed');
    } finally {
      document.body.removeChild(textArea);
    }
  }

  function onCopiedSuccess(targetBtn = btnCopy, toastMsg = 'Breakdown copied to clipboard!') {
    if (targetBtn) {
      targetBtn.classList.add('copied');
      const originalText = targetBtn.innerHTML;
      targetBtn.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Copied!</span>
      `;

      setTimeout(() => {
        targetBtn.classList.remove('copied');
        targetBtn.innerHTML = originalText;
      }, 2000);
    }
    showToast(toastMsg);
  }

  // --- HAMBURGER MENU & DRAWER ---

  function toggleDrawer() {
    const isOpen = mobileDrawer.classList.contains('open');
    if (isOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }

  function openDrawer() {
    mobileDrawer.classList.add('open');
    drawerOverlay.classList.add('active');
    hamburgerBtn.classList.add('active');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    mobileDrawer.classList.remove('open');
    drawerOverlay.classList.remove('active');
    hamburgerBtn.classList.remove('active');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  // --- MODAL CONTROLS ---

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  // --- PRESET SCENARIO CHIPS ---

  const SAMPLE_PRESETS = {
    chai: { occasion: 'Evening Chai & Snacks ☕', bill: '240.00', people: 4, tip: 10, note: 'Pay by evening please!' },
    dinner: { occasion: 'Dinner Outing 🍽️', bill: '3450.00', people: 5, tip: 15, note: 'Includes food + mocktails' },
    goa: { occasion: 'Weekend Beach Trip 🏖️', bill: '7820.00', people: 6, tip: 10, note: 'Villa rental + cab share' },
    flat: { occasion: 'Flat Shared Groceries 🛒', bill: '4235.00', people: 3, tip: 0, note: 'Monthly kitchen supplies' }
  };

  function applyPreset(presetKey) {
    const data = SAMPLE_PRESETS[presetKey];
    if (!data) return;

    occasionInput.value = data.occasion;
    billInput.value = data.bill;
    peopleInput.value = data.people;
    groupNoteInput.value = data.note || '';

    appState.isCustomTip = false;
    appState.tipPercent = data.tip;
    appState.customTipVal = '';
    customTipInput.value = '';

    renderPersonInputs();
    updateTipSelectionUI();
    calculateSplit(true, true);
    showToast(`Loaded "${data.occasion}"`);
  }

  // --- EVENT LISTENERS INITIALIZATION ---

  function initEventListeners() {
    // 1. Reactive calculation on bill input
    billInput.addEventListener('input', () => {
      clearErrors();
      calculateSplit(false, false);
    });

    // 2. Number of People Input & Steppers
    peopleInput.addEventListener('input', () => {
      clearErrors();
      renderPersonInputs();
      calculateSplit(false, false);
    });

    btnDecreasePeople.addEventListener('click', () => {
      let current = parseInt(peopleInput.value, 10) || 1;
      if (current > 1) {
        peopleInput.value = current - 1;
        clearErrors();
        renderPersonInputs();
        calculateSplit(false, false);
      }
    });

    btnIncreasePeople.addEventListener('click', () => {
      let current = parseInt(peopleInput.value, 10) || 1;
      peopleInput.value = current + 1;
      clearErrors();
      renderPersonInputs();
      calculateSplit(false, false);
    });

    // 3. Currency Selector Dropdown
    currencySelect.addEventListener('change', (e) => {
      applyCurrency(e.target.value, true);
      const curr = getActiveCurrency();
      showToast(`Currency updated to ${curr.name}`);
    });

    // 4. Custom Person Names Quick Actions
    btnFillSampleNames.addEventListener('click', fillSampleNames);
    btnClearNames.addEventListener('click', clearAllPersonNames);

    // 5. Round-Up Shares Toggle Button
    if (btnRoundUp) {
      btnRoundUp.addEventListener('click', toggleRoundUp);
    }

    // 6. Occasion, UPI & Group Note Inputs
    occasionInput.addEventListener('input', () => {
      if (appState.hasCalculated) {
        displayOccasion.textContent = occasionInput.value.trim() || 'General Bill';
      }
      saveState();
    });

    groupNoteInput.addEventListener('input', () => {
      appState.groupNote = groupNoteInput.value.trim();
      saveState();
      if (appState.hasCalculated) {
        if (appState.groupNote && groupNoteBanner && displayGroupNote) {
          displayGroupNote.textContent = appState.groupNote;
          groupNoteBanner.style.display = 'flex';
        } else if (groupNoteBanner) {
          groupNoteBanner.style.display = 'none';
        }
      }
    });

    upiIdInput.addEventListener('input', () => {
      appState.upiId = upiIdInput.value.trim();
      saveState();
      if (appState.hasCalculated) {
        calculateSplit(false, false);
      }
    });

    // Copy UPI Link Button
    if (btnCopyUpi) {
      btnCopyUpi.addEventListener('click', () => {
        const upiUri = btnUpiPay ? btnUpiPay.href : '';
        if (upiUri) {
          if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(upiUri).then(() => {
              showToast('UPI payment link copied!');
            });
          } else {
            fallbackCopyText(upiUri);
          }
        }
      });
    }

    // 7. Tip Presets
    tipButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        appState.isCustomTip = false;
        appState.tipPercent = parseFloat(btn.dataset.tip);
        appState.customTipVal = '';
        customTipInput.value = '';
        updateTipSelectionUI();
        calculateSplit(false, false);
      });
    });

    customTipInput.addEventListener('input', () => {
      appState.isCustomTip = true;
      appState.customTipVal = customTipInput.value;
      updateTipSelectionUI();
      calculateSplit(false, false);
    });

    // 8. Theme Toggles
    themeToggleDesktop.addEventListener('click', toggleTheme);
    themeToggleMobile.addEventListener('click', () => {
      toggleTheme();
      closeDrawer();
    });

    // 9. Primary Actions
    btnCalculate.addEventListener('click', () => {
      calculateSplit(true, true);
    });

    btnReset.addEventListener('click', resetApp);
    btnCopy.addEventListener('click', copyBreakdown);
    if (btnShare) {
      btnShare.addEventListener('click', shareBreakdown);
    }
    btnDownloadReceipt.addEventListener('click', downloadReceipt);

    // 10. History Clear Button
    btnClearHistory.addEventListener('click', clearHistory);

    navResetBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        closeDrawer();
        resetApp();
      });
    });

    // 11. Hamburger & Drawer Navigation
    hamburgerBtn.addEventListener('click', toggleDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);

    mobileDrawer.querySelectorAll('.drawer-link:not(#themeToggleMobile)').forEach((link) => {
      link.addEventListener('click', () => {
        closeDrawer();
      });
    });

    // 12. Modal Controls
    openHelpBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        closeDrawer();
        openModal(helpModal);
      });
    });

    openFeaturesBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        closeDrawer();
        openModal(featuresModal);
      });
    });

    modalCloseBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        closeModal(helpModal);
        closeModal(featuresModal);
      });
    });

    [helpModal, featuresModal].forEach((modal) => {
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            closeModal(modal);
          }
        });
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDrawer();
        closeModal(helpModal);
        closeModal(featuresModal);
      }
    });

    // 13. Preset Scenario Chips
    presetChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const key = chip.dataset.preset;
        applyPreset(key);
      });
    });
  }

  // --- BOOTSTRAP ---
  document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    restoreState();
  });

})();
