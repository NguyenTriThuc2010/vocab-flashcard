let currentCards = [...VOCAB_DATA];
let currentIndex = 0;
let isFlipped = false;

// DOM Elements
const flashcard = document.getElementById('flashcard');
const progressBar = document.getElementById('progress-bar');
const currentIdxEl = document.getElementById('current-idx');
const totalIdxEl = document.getElementById('total-idx');

// Buttons
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnShuffle = document.getElementById('btn-shuffle');

function updateUI() {
    const card = currentCards[currentIndex];
    
    // Front
    document.getElementById('card-topic').textContent = card.topic;
    document.getElementById('card-word').textContent = card.word;
    document.getElementById('card-pos').textContent = card.pos;
    document.getElementById('card-phonetic').textContent = card.phonetic;
    
    // Back
    document.getElementById('card-topic-back').textContent = card.topic;
    document.getElementById('card-word-back').textContent = card.word;
    document.getElementById('card-pos-back').textContent = card.pos;
    document.getElementById('card-phonetic-back').textContent = card.phonetic;
    
    document.getElementById('card-meaning').innerHTML = `<span class="lang-tag">VN</span> ${card.meaning_vn}`;
    
    // Details
    const collBox = document.getElementById('collocations-container');
    if (card.collocations && card.collocations.length > 0) {
        collBox.style.display = 'block';
        document.getElementById('card-collocations').innerHTML = card.collocations.join(' &middot; ');
    } else {
        collBox.style.display = 'none';
    }
    
    document.getElementById('card-example').textContent = card.example;
    document.getElementById('card-band').textContent = card.band;
    
    // Progress
    currentIdxEl.textContent = currentIndex + 1;
    totalIdxEl.textContent = currentCards.length;
    progressBar.style.width = `${((currentIndex + 1) / currentCards.length) * 100}%`;
    
    // Ensure card shows front when updated
    if (isFlipped) {
        flashcard.classList.remove('is-flipped');
        isFlipped = false;
    }
}

function changeCard(newIndex) {
    if (isFlipped) {
        flashcard.classList.remove('is-flipped');
        isFlipped = false;
        setTimeout(() => {
            currentIndex = newIndex;
            updateUI();
        }, 150); // fast transition feeling
    } else {
        currentIndex = newIndex;
        updateUI();
    }
}

// Events
flashcard.addEventListener('click', () => {
    isFlipped = !isFlipped;
    if(isFlipped) {
        flashcard.classList.add('is-flipped');
    } else {
        flashcard.classList.remove('is-flipped');
    }
});

btnNext.addEventListener('click', () => {
    let nextIdx = currentIndex + 1;
    if (nextIdx >= currentCards.length) nextIdx = 0;
    changeCard(nextIdx);
});

btnPrev.addEventListener('click', () => {
    let prevIdx = currentIndex - 1;
    if (prevIdx < 0) prevIdx = currentCards.length - 1;
    changeCard(prevIdx);
});

btnShuffle.addEventListener('click', () => {
    // Fisher-Yates
    for (let i = currentCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentCards[i], currentCards[j]] = [currentCards[j], currentCards[i]];
    }
    currentIndex = 0;
    changeCard(currentIndex);
});

// Touch swipe logic for Mobile
let touchStartX = 0;
let touchEndX = 0;

flashcard.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
});

flashcard.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    if (touchEndX < touchStartX - swipeThreshold) {
        // Swipe left -> Next
        let nextIdx = currentIndex + 1;
        if (nextIdx < currentCards.length) {
            changeCard(nextIdx);
        } else {
            changeCard(0);
        }
    }
    if (touchEndX > touchStartX + swipeThreshold) {
        // Swipe right -> Prev
        let prevIdx = currentIndex - 1;
        if (prevIdx >= 0) {
            changeCard(prevIdx);
        } else {
            changeCard(currentCards.length - 1);
        }
    }
}

// Keyboard navigation
document.addEventListener('keydown', e => {
    if(e.code === 'Space') {
        flashcard.click();
        e.preventDefault();
    } else if (e.code === 'ArrowRight') {
        btnNext.click();
    } else if (e.code === 'ArrowLeft') {
        btnPrev.click();
    }
});

// init
window.addEventListener('DOMContentLoaded', updateUI);
