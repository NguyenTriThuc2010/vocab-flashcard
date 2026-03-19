let currentTopic = 'All';
let currentCards = [...VOCAB_DATA];
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
    alert('Đã lưu API Key!');
});

function renderTopics() {
    const topicMap = {};
    VOCAB_DATA.forEach(word => {
        topicMap[word.topic] = (topicMap[word.topic] || 0) + 1;
    });

    topicList.innerHTML = `<li class="topic-item ${currentTopic === 'All' ? 'active' : ''}" data-topic="All">
        <span>Tất cả</span>
        <span class="topic-count">${VOCAB_DATA.length}</span>
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
            if (currentTopic === 'All') {
                currentCards = [...VOCAB_DATA];
            } else {
                currentCards = VOCAB_DATA.filter(w => w.topic === currentTopic);
            }
            currentIndex = 0;
            updateUI();
            renderTopics();
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
        if(data.error) throw new Error(data.error.message);

        let jsonText = data.candidates[0].content.parts[0].text;
        jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
        const newWords = JSON.parse(jsonText);

        VOCAB_DATA.push(...newWords);
        
        currentTopic = topicName;
        currentCards = VOCAB_DATA.filter(w => w.topic === currentTopic);
        currentIndex = 0;
        
        renderTopics();
        updateUI();
        toggleSidebar();
        aiTopicInput.value = '';
        alert(`Đã tạo thành công ${newWords.length} thẻ từ vựng mới!`);

    } catch (err) {
        alert('Có lỗi xảy ra hoặc API trả về không chuẩn: ' + err.message);
    } finally {
        aiLoading.style.display = 'none';
        aiGenerateBtn.disabled = false;
    }
});

// --- CARD UI & LOGIC --- //
function updateUI() {
    if (currentCards.length === 0) return;

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

// Init
window.addEventListener('DOMContentLoaded', () => {
    renderTopics();
    updateUI();
});
