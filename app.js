
const firebaseConfig = {
    apiKey: "AIzaSyBid11YgLIpzCfnlNXcGmy6czaYaF-ed6s",
    authDomain: "vocab-50bbd.firebaseapp.com",
    databaseURL: "https://vocab-50bbd-default-rtdb.firebaseio.com",
    projectId: "vocab-50bbd",
    storageBucket: "vocab-50bbd.firebasestorage.app",
    messagingSenderId: "144446094577",
    appId: "1:144446094577:web:579a916993cbe4b905bd50",
    measurementId: "G-HGMMDBNTGM"
};
// Initialize Firebase
let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
} catch (e) {
    console.error("Firebase initialization error. Make sure to update firebaseConfig.", e);
}

// Global States
let ALL_VOCAB = [];
let currentTopic = 'All';
let currentCards = [];
let currentIndex = 0;
let isFlipped = false;

// DOM Elements - Main
const flashcard = document.getElementById('flashcard');
const progressBar = document.getElementById('progress-bar');
const currentIdxEl = document.getElementById('current-idx');
const totalIdxEl = document.getElementById('total-idx');

const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnShuffle = document.getElementById('btn-shuffle');

// DOM Elements - Sidebar
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const menuBtn = document.getElementById('menu-btn');
const closeBtn = document.getElementById('close-btn');
const apiKeyInput = document.getElementById('api-key-input');
const saveKeyBtn = document.getElementById('save-key-btn');
const aiTopicInput = document.getElementById('ai-topic-input');
const aiGenerateBtn = document.getElementById('ai-generate-btn');
const aiLoading = document.getElementById('ai-loading');
const topicList = document.getElementById('topic-list');

// --- FIREBASE REALTIME DB LISTENER ---
if (db) {
    db.ref('flashcards').on('value', (snapshot) => {
        const data = snapshot.val();

        if (data) {
            // Convert object dictionary { key1: {...}, key2: {...} } into array
            ALL_VOCAB = Object.values(data);
        } else {
            // If DB is completely empty, push seed data from words.js to Firebase
            if (typeof VOCAB_DATA !== 'undefined' && VOCAB_DATA.length > 0) {
                console.log("Seeding Firebase with words.js...");
                ALL_VOCAB = [...VOCAB_DATA];
                const ref = db.ref('flashcards');
                ALL_VOCAB.forEach(word => {
                    ref.push(word);
                });
            } else {
                ALL_VOCAB = [];
            }
        }

        // Always refresh active cards
        applyFilter();
    });
}

function applyFilter() {
    if (currentTopic === 'All') {
        currentCards = [...ALL_VOCAB];
    } else {
        currentCards = ALL_VOCAB.filter(w => w.topic === currentTopic);
    }

    // Bounds check
    if (currentIndex >= currentCards.length) currentIndex = 0;

    renderTopics();
    updateUI();
}

// --- SIDEBAR & SETTINGS --- //
function toggleSidebar() {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

menuBtn.addEventListener('click', toggleSidebar);
closeBtn.addEventListener('click', toggleSidebar);
overlay.addEventListener('click', toggleSidebar);

const savedKey = localStorage.getItem('gemini_api_key');
if (savedKey) apiKeyInput.value = savedKey;

saveKeyBtn.addEventListener('click', () => {
    localStorage.setItem('gemini_api_key', apiKeyInput.value.trim());
    alert('Đã lưu API Key Gemini!');
});

function renderTopics() {
    const topicMap = {};
    ALL_VOCAB.forEach(word => {
        topicMap[word.topic] = (topicMap[word.topic] || 0) + 1;
    });

    topicList.innerHTML = `<li class="topic-item ${currentTopic === 'All' ? 'active' : ''}" data-topic="All">
        <span>Tất cả</span>
        <span class="topic-count">${ALL_VOCAB.length}</span>
    </li>`;

    Object.keys(topicMap).forEach(topic => {
        topicList.innerHTML += `<li class="topic-item ${currentTopic === topic ? 'active' : ''}" data-topic="${topic}">
            <span>${topic}</span>
            <span class="topic-count">${topicMap[topic]}</span>
        </li>`;
    });

    document.querySelectorAll('.topic-item').forEach(item => {
        item.addEventListener('click', () => {
            currentTopic = item.dataset.topic;
            applyFilter();
            toggleSidebar();
        });
    });
}

// --- AI GENERATION --- //
aiGenerateBtn.addEventListener('click', async () => {
    const key = localStorage.getItem('gemini_api_key');
    if (!key) return alert('Vui lòng nhập và lưu API Key trước!');
    const topicName = aiTopicInput.value.trim();
    if (!topicName) return alert('Vui lòng nhập tên chủ đề!');

    if (!db) return alert("Firebase chưa được cấu hình! Hãy điền config vào app.js");

    aiLoading.style.display = 'block';
    aiGenerateBtn.disabled = true;

    try {
        const prompt = `Tạo 5 từ vựng/cụm từ học thuật tiếng Anh ở trình độ IELTS Band 7.0 trở lên chuyên sâu về chủ đề: "${topicName}".
Trả về duy nhất dữ liệu dạng JSON mảng các object, không giải thích thêm, thiết lập field như sau:
[
  {
    "topic": "${topicName}",
    "word": "từ_vựng",
    "pos": "từ_loại_viết_tắt(VD: n. v. adj.)",
    "phonetic": "/phiên_âm/",
    "meaning_vn": "nghĩa_tiếng_việt",
    "collocations": ["cụm 1", "cụm 2"],
    "example": "ví_dụ_tiếng_anh",
    "band": "Band 7+"
  }
]`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        let jsonText = data.candidates[0].content.parts[0].text;
        jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
        const newWords = JSON.parse(jsonText);

        // Đẩy từ mới thẳng lên Firebase Realtime Database
        const ref = db.ref('flashcards');
        newWords.forEach(word => {
            ref.push(word);
        });

        currentTopic = topicName;
        // The list and UI will update automatically from Firebase listener 'value'

        toggleSidebar();
        aiTopicInput.value = '';
        alert(`Đã yêu cầu AI tạo ${newWords.length} thẻ từ vựng mới và lưu lên Firebase!`);

    } catch (err) {
        alert('Có lỗi xảy ra hoặc API trả về không chuẩn: ' + err.message);
    } finally {
        aiLoading.style.display = 'none';
        aiGenerateBtn.disabled = false;
    }
});

// --- CARD UI & LOGIC --- //
function updateUI() {
    if (currentCards.length === 0) {
        document.getElementById('card-topic').textContent = '?';
        document.getElementById('card-word').textContent = 'Trống';
        document.getElementById('card-pos').textContent = '';
        document.getElementById('card-phonetic').textContent = '';
        document.getElementById('card-topic-back').textContent = '?';
        document.getElementById('card-word-back').textContent = 'Chưa có dữ liệu';
        document.getElementById('card-pos-back').textContent = '';
        document.getElementById('card-phonetic-back').textContent = '';
        document.getElementById('card-meaning').innerHTML = '';
        document.getElementById('card-example').textContent = 'Hãy tạo thêm từ vựng từ Sidebar.';
        document.getElementById('card-band').textContent = '';
        document.getElementById('collocations-container').style.display = 'none';

        currentIdxEl.textContent = 0;
        totalIdxEl.textContent = 0;
        progressBar.style.width = '0%';
        return;
    }

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
    if (currentCards.length === 0) return;

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
    if (currentCards.length === 0) return;
    isFlipped = !isFlipped;
    if (isFlipped) {
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
    if (e.code === 'Space') {
        flashcard.click();
        e.preventDefault();
    } else if (e.code === 'ArrowRight') {
        btnNext.click();
    } else if (e.code === 'ArrowLeft') {
        btnPrev.click();
    }
});

// Init if completely offline or firebase fails
window.addEventListener('DOMContentLoaded', () => {
    updateUI();
});
