// Application State
let state = {
    releases: [],
    selectedUpdates: new Map(), // Maps updateId -> updateObject
    filters: {
        search: '',
        type: 'ALL'
    }
};

// DOM Elements
const elements = {
    refreshBtn: document.getElementById('refresh-btn'),
    refreshSpinner: document.getElementById('refresh-spinner'),
    lastUpdatedTime: document.getElementById('last-updated-time'),
    searchInput: document.getElementById('search-input'),
    typeFilter: document.getElementById('type-filter'),
    statsBanner: document.getElementById('stats-banner'),
    totalDays: document.getElementById('total-days'),
    totalUpdates: document.getElementById('total-updates'),
    selectedCounter: document.getElementById('selected-counter'),
    selectedNum: document.getElementById('selected-num'),
    clearSelectedBtn: document.getElementById('clear-selected-btn'),
    
    feedLoading: document.getElementById('feed-loading'),
    feedError: document.getElementById('feed-error'),
    feedEmpty: document.getElementById('feed-empty'),
    errorMessage: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn'),
    releasesList: document.getElementById('releases-list'),
    
    tweetModal: document.getElementById('tweet-modal'),
    closeModal: document.getElementById('close-modal'),
    cancelTweet: document.getElementById('cancel-tweet'),
    publishTweet: document.getElementById('publish-tweet'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    charCounter: document.getElementById('char-counter'),
    charWarn: document.getElementById('char-warn'),
    
    floatingShareBar: document.getElementById('floating-share-bar'),
    floatingCount: document.getElementById('floating-count'),
    tweetSelectedBtn: document.getElementById('tweet-selected-btn'),
    
    // New Elements
    themeToggle: document.getElementById('theme-toggle'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    searchClear: document.getElementById('search-clear'),
    toastNotification: document.getElementById('toast-notification'),
    toastMessage: document.getElementById('toast-message'),
    trimTweetBtn: document.getElementById('trim-tweet')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadReleases();
    setupEventListeners();
});

// Event Listeners Configuration
function setupEventListeners() {
    elements.refreshBtn.addEventListener('click', () => loadReleases());
    elements.retryBtn.addEventListener('click', () => loadReleases());
    
    // Theme Switch Toggle
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (elements.themeToggle) elements.themeToggle.checked = true;
    }
    
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.add('light-theme');
                localStorage.setItem('theme', 'light');
            } else {
                document.body.classList.remove('light-theme');
                localStorage.setItem('theme', 'dark');
            }
        });
    }

    // Export CSV
    if (elements.exportCsvBtn) {
        elements.exportCsvBtn.addEventListener('click', () => exportToCSV());
    }
    
    // Filters
    elements.searchInput.addEventListener('input', debounce((e) => {
        const val = e.target.value;
        state.filters.search = val.toLowerCase();
        if (elements.searchClear) {
            elements.searchClear.style.display = val ? 'flex' : 'none';
        }
        render();
    }, 150));
    
    if (elements.searchClear) {
        elements.searchClear.addEventListener('click', () => {
            elements.searchInput.value = '';
            state.filters.search = '';
            elements.searchClear.style.display = 'none';
            render();
        });
    }
    
    elements.typeFilter.addEventListener('change', (e) => {
        state.filters.type = e.target.value;
        render();
    });
    
    elements.clearSelectedBtn.addEventListener('click', () => {
        state.selectedUpdates.clear();
        updateSelectionUI();
        render();
    });
    
    // Modal controls
    elements.closeModal.addEventListener('click', hideTweetModal);
    elements.cancelTweet.addEventListener('click', hideTweetModal);
    
    elements.tweetTextarea.addEventListener('input', (e) => {
        updateCharCount(e.target.value);
    });
    
    elements.publishTweet.addEventListener('click', () => {
        const text = elements.tweetTextarea.value;
        if (text.length > 280) return;
        
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterIntentUrl, '_blank');
        hideTweetModal();
    });
    
    if (elements.trimTweetBtn) {
        elements.trimTweetBtn.addEventListener('click', () => {
            autoTrimTweetText();
        });
    }
    
    elements.tweetSelectedBtn.addEventListener('click', () => {
        openTweetModalForSelection();
    });
}

// Fetch Release Notes from API
async function loadReleases() {
    showState('loading');
    elements.refreshSpinner.classList.add('active');
    elements.refreshBtn.disabled = true;
    
    try {
        const response = await fetch('/api/releases');
        if (!response.ok) {
            throw new Error(`Server returned HTTP status ${response.status}`);
        }
        
        const data = await response.json();
        state.releases = data;
        
        // Update Timestamp
        const now = new Date();
        elements.lastUpdatedTime.textContent = `Refreshed at ${now.toLocaleTimeString()}`;
        
        render();
        showToast('Release notes feed updated! ⚡');
    } catch (error) {
        console.error('Error fetching release notes:', error);
        elements.errorMessage.textContent = error.message || 'Could not connect to the release feed service.';
        showState('error');
    } finally {
        elements.refreshSpinner.classList.remove('active');
        elements.refreshBtn.disabled = false;
    }
}

// Manage Loading/Error/Empty/Content states
function showState(currentState) {
    elements.feedLoading.style.display = currentState === 'loading' ? 'block' : 'none';
    elements.feedError.style.display = currentState === 'error' ? 'block' : 'none';
    elements.feedEmpty.style.display = currentState === 'empty' ? 'block' : 'none';
    elements.releasesList.style.display = currentState === 'content' ? 'block' : 'none';
    
    if (currentState === 'loading' || currentState === 'error') {
        elements.statsBanner.style.display = 'none';
    }
}

// Filter and Render Data
function render() {
    let filteredCount = 0;
    let daysCount = 0;
    
    elements.releasesList.innerHTML = '';
    
    if (state.releases.length === 0) {
        showState('empty');
        return;
    }
    
    state.releases.forEach(dayRelease => {
        // Filter updates within the day
        const matchedUpdates = dayRelease.updates.filter(update => {
            // Filter by type
            if (state.filters.type !== 'ALL') {
                if (state.filters.type === 'Other') {
                    const knownTypes = ['Feature', 'Issue', 'Change', 'Deprecation'];
                    if (knownTypes.includes(update.type)) return false;
                } else if (state.filters.type === 'Change') {
                    if (update.type !== 'Change' && update.type !== 'Deprecation') return false;
                } else if (update.type !== state.filters.type) {
                    return false;
                }
            }
            
            // Filter by search term
            if (state.filters.search) {
                const searchMatch = update.text.toLowerCase().includes(state.filters.search) || 
                                    update.type.toLowerCase().includes(state.filters.search) ||
                                    dayRelease.title.toLowerCase().includes(state.filters.search);
                if (!searchMatch) return false;
            }
            
            return true;
        });
        
        if (matchedUpdates.length > 0) {
            daysCount++;
            filteredCount += matchedUpdates.length;
            
            const dayElement = createReleaseDayDOM(dayRelease, matchedUpdates);
            elements.releasesList.appendChild(dayElement);
        }
    });
    
    // Stats Update
    elements.totalDays.textContent = daysCount;
    elements.totalUpdates.textContent = filteredCount;
    elements.statsBanner.style.display = 'flex';
    
    if (filteredCount === 0) {
        showState('empty');
    } else {
        showState('content');
    }
}

// Create DOM structure for a single release date group
function createReleaseDayDOM(dayRelease, matchedUpdates) {
    const group = document.createElement('div');
    group.className = 'release-group';
    
    // Group Header
    const header = document.createElement('div');
    header.className = 'release-group-header';
    
    const dateTitle = document.createElement('h2');
    dateTitle.className = 'release-date';
    dateTitle.textContent = dayRelease.title;
    
    const sourceLink = document.createElement('a');
    sourceLink.className = 'release-link';
    sourceLink.href = dayRelease.link;
    sourceLink.target = '_blank';
    sourceLink.rel = 'noopener noreferrer';
    sourceLink.innerHTML = 'View Source 🔗';
    
    header.appendChild(dateTitle);
    header.appendChild(sourceLink);
    group.appendChild(header);
    
    // Updates List
    const container = document.createElement('div');
    container.className = 'updates-container';
    
    matchedUpdates.forEach(update => {
        const isSelected = state.selectedUpdates.has(update.id);
        const card = document.createElement('div');
        card.className = `update-card ${isSelected ? 'selected' : ''}`;
        card.setAttribute('data-id', update.id);
        card.setAttribute('data-type', update.type);
        
        // Header (badge and actions)
        const cardHeader = document.createElement('div');
        cardHeader.className = 'update-card-header';
        
        const badgeType = ['Feature', 'Issue', 'Change', 'Deprecation'].includes(update.type) ? update.type.toLowerCase() : 'other';
        const badge = document.createElement('span');
        badge.className = `badge badge-${badgeType}`;
        badge.textContent = update.type;
        
        const cardActions = document.createElement('div');
        cardActions.className = 'card-actions';
        
        const tweetBtn = document.createElement('button');
        tweetBtn.className = 'btn-tweet-micro';
        tweetBtn.title = 'Tweet this update';
        tweetBtn.innerHTML = '🐦';
        tweetBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Don't trigger card selection
            openTweetModalForSingle(dayRelease.title, update);
        });
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn-copy-micro';
        copyBtn.title = 'Copy text to clipboard';
        copyBtn.innerHTML = '📋';
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Don't trigger card selection
            navigator.clipboard.writeText(update.text).then(() => {
                copyBtn.innerHTML = '✔';
                copyBtn.classList.add('copied');
                showToast('Copied update to clipboard! 📋');
                setTimeout(() => {
                    copyBtn.innerHTML = '📋';
                    copyBtn.classList.remove('copied');
                }, 1500);
            }).catch(err => {
                console.error('Failed to copy: ', err);
            });
        });
        
        const checkbox = document.createElement('div');
        checkbox.className = 'checkbox-circle';
        checkbox.innerHTML = '✓';
        
        cardActions.appendChild(tweetBtn);
        cardActions.appendChild(copyBtn);
        cardActions.appendChild(checkbox);
        
        cardHeader.appendChild(badge);
        cardHeader.appendChild(cardActions);
        card.appendChild(cardHeader);
        
        // Body (HTML description)
        const cardBody = document.createElement('div');
        cardBody.className = 'update-body';
        cardBody.innerHTML = highlightKeywords(update.html, state.filters.search);
        
        // Prevent clicking links in the body from selecting the card
        cardBody.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => e.stopPropagation());
        });
        
        card.appendChild(cardBody);
        
        // Accessibility & Keyboard Toggle
        card.setAttribute('tabindex', '0');
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSelectUpdate(update, dayRelease.title);
            }
        });
        
        // Card Click Handler (Select/Deselect)
        card.addEventListener('click', () => {
            const selectedText = window.getSelection().toString();
            if (selectedText) return; // Selection guard
            toggleSelectUpdate(update, dayRelease.title);
        });
        
        container.appendChild(card);
    });
    
    group.appendChild(container);
    return group;
}

// Select / Deselect Logic
function toggleSelectUpdate(update, dateTitle) {
    if (state.selectedUpdates.has(update.id)) {
        state.selectedUpdates.delete(update.id);
    } else {
        state.selectedUpdates.set(update.id, {
            ...update,
            date: dateTitle
        });
    }
    
    // Toggle visual class directly
    const card = document.querySelector(`.update-card[data-id="${update.id}"]`);
    if (card) {
        card.classList.toggle('selected');
    }
    
    updateSelectionUI();
}

// Update floating and counts panel based on selection state
function updateSelectionUI() {
    const count = state.selectedUpdates.size;
    
    if (count > 0) {
        // Update stats bar selection count
        elements.selectedNum.textContent = count;
        elements.selectedCounter.style.display = 'flex';
        
        // Update floating bar
        elements.floatingCount.textContent = count;
        elements.floatingShareBar.style.display = 'block';
    } else {
        elements.selectedCounter.style.display = 'none';
        elements.floatingShareBar.style.display = 'none';
    }
}

// Modal management
function showTweetModal(text) {
    elements.tweetTextarea.value = text;
    updateCharCount(text);
    elements.tweetModal.style.display = 'flex';
    elements.tweetTextarea.focus();
}

function hideTweetModal() {
    elements.tweetModal.style.display = 'none';
}

function updateCharCount(text) {
    const len = text.length;
    elements.charCounter.textContent = `${len} / 280`;
    
    if (len > 280) {
        elements.charCounter.style.color = 'var(--accent-issue)';
        elements.charWarn.style.display = 'block';
        elements.publishTweet.disabled = true;
        elements.publishTweet.style.opacity = '0.5';
        if (elements.trimTweetBtn) elements.trimTweetBtn.style.display = 'block';
    } else {
        elements.charCounter.style.color = len > 260 ? 'var(--accent-change)' : 'var(--text-muted)';
        elements.charWarn.style.display = 'none';
        elements.publishTweet.disabled = false;
        elements.publishTweet.style.opacity = '1';
        if (elements.trimTweetBtn) elements.trimTweetBtn.style.display = 'none';
    }
}

// Draft single update Tweet
function openTweetModalForSingle(date, update) {
    // Format: "BigQuery Release (June 15, 2026): [Feature] Use Gemini Cloud Assist to analyze SQL... https://cloud.google.com/bigquery/docs/release-notes"
    const prefix = `BigQuery Release (${date}) - [${update.type}]: `;
    const suffix = ` #BigQuery #GoogleCloud`;
    const maxDescLen = 280 - prefix.length - suffix.length;
    
    let desc = update.text;
    if (desc.length > maxDescLen) {
        desc = desc.substring(0, maxDescLen - 3) + '...';
    }
    
    const tweetText = `${prefix}${desc}${suffix}`;
    showTweetModal(tweetText);
}

// Draft multiple updates Tweet
function openTweetModalForSelection() {
    if (state.selectedUpdates.size === 0) return;
    
    const selectedList = Array.from(state.selectedUpdates.values());
    let tweetText = `BigQuery Release Updates:\n`;
    
    selectedList.forEach((update, idx) => {
        const itemText = `• [${update.date}] (${update.type}): ${update.text}\n`;
        if ((tweetText + itemText + ` #BigQuery`).length <= 270) {
            tweetText += itemText;
        }
    });
    
    tweetText += ` #BigQuery`;
    
    // Cap strictly at 280
    if (tweetText.length > 280) {
        tweetText = tweetText.substring(0, 277) + '...';
    }
    
    showTweetModal(tweetText);
}

// Export filtered updates to CSV
function exportToCSV() {
    if (state.releases.length === 0) {
        showToast('No data to export! 📂');
        return;
    }
    
    let csvRows = [];
    // CSV Header
    csvRows.push(['Date', 'Type', 'Description', 'Link'].map(val => `"${val.replace(/"/g, '""')}"`).join(','));
    
    state.releases.forEach(dayRelease => {
        const matchedUpdates = dayRelease.updates.filter(update => {
            // Apply current filters
            if (state.filters.type !== 'ALL') {
                if (state.filters.type === 'Other') {
                    const knownTypes = ['Feature', 'Issue', 'Change', 'Deprecation'];
                    if (knownTypes.includes(update.type)) return false;
                } else if (state.filters.type === 'Change') {
                    if (update.type !== 'Change' && update.type !== 'Deprecation') return false;
                } else if (update.type !== state.filters.type) {
                    return false;
                }
            }
            
            if (state.filters.search) {
                const searchMatch = update.text.toLowerCase().includes(state.filters.search) || 
                                    update.type.toLowerCase().includes(state.filters.search) ||
                                    dayRelease.title.toLowerCase().includes(state.filters.search);
                if (!searchMatch) return false;
            }
            
            return true;
        });
        
        matchedUpdates.forEach(update => {
            const dateVal = dayRelease.title;
            const typeVal = update.type;
            const descVal = update.text;
            const linkVal = dayRelease.link;
            
            const row = [dateVal, typeVal, descVal, linkVal].map(val => {
                const escaped = (val || '').replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(row.join(','));
        });
    });
    
    if (csvRows.length <= 1) {
        showToast('No matching updates found to export! 🔍');
        return;
    }
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bigquery_release_notes_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported CSV file successfully! 📥');
}

// ==========================================================================
// UX Polished Helpers (Debouncer, Highlighting, Auto-Trim, Toast Notifier)
// ==========================================================================

// Debounce helper for inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Regex search highlight helper (outside of tag attributes)
function highlightKeywords(html, query) {
    if (!query) return html;
    try {
        const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(?![^<>]*>)(${escapedQuery})`, 'gi');
        return html.replace(regex, '<mark class="highlight">$1</mark>');
    } catch (e) {
        console.error('Highlight regex error:', e);
        return html;
    }
}

// Toast notification trigger
let toastTimeout;
function showToast(message) {
    if (!elements.toastNotification || !elements.toastMessage) return;
    
    elements.toastMessage.textContent = message;
    elements.toastNotification.classList.add('show');
    
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        elements.toastNotification.classList.remove('show');
    }, 2500);
}

// Auto-trim long tweet text to satisfy 280-char limit
function autoTrimTweetText() {
    let text = elements.tweetTextarea.value;
    if (text.length <= 280) return;
    
    // Find suffix/hashtags (e.g. " #BigQuery")
    const hashtagRegex = /\s(#[A-Za-z0-9]+(\s#[A-Za-z0-9]+)*)$/;
    const match = text.match(hashtagRegex);
    
    let suffix = "";
    let mainBody = text;
    
    if (match) {
        suffix = match[0];
        mainBody = text.substring(0, text.length - suffix.length);
    }
    
    const maxBodyLen = 280 - suffix.length - 3; // -3 for '...'
    
    if (maxBodyLen > 0 && mainBody.length > maxBodyLen) {
        mainBody = mainBody.substring(0, maxBodyLen) + "...";
    }
    
    const trimmedText = mainBody + suffix;
    elements.tweetTextarea.value = trimmedText;
    updateCharCount(trimmedText);
    showToast("Tweet text auto-trimmed! ✂️");
}
