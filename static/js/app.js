// ===== 状態管理 =====
const state = {
    currentStep: 1,
    schoolName: '',
    teacherName: '',
    grade: '',
    subject: '',
    theme: '',
    notes: '',
    formats: [],
    difficulty: '',
    count: 5,
    title: '',
    problems: [],
    colorTheme: 'soft'
};

// ===== 丸数字 =====
const circledNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'];

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', () => {
    initChipSelectors();
});

function initChipSelectors() {
    // 教科チップ（単一選択）
    document.querySelectorAll('#subjectGrid .subject-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#subjectGrid .subject-chip').forEach(c => c.classList.remove('selected'));
            chip.classList.toggle('selected');
            state.subject = chip.classList.contains('selected') ? chip.dataset.value : '';
        });
    });

    // 問題形式チップ（複数選択）
    document.querySelectorAll('#formatGrid .format-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('selected');
            state.formats = Array.from(document.querySelectorAll('#formatGrid .format-chip.selected'))
                .map(c => c.dataset.value);
        });
    });

    // 難易度チップ（単一選択）
    document.querySelectorAll('#difficultyGroup .difficulty-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#difficultyGroup .difficulty-chip').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
            state.difficulty = chip.dataset.value;
        });
    });

    // 問題数チップ（単一選択）
    document.querySelectorAll('#countGroup .count-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#countGroup .count-chip').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
            state.count = parseInt(chip.dataset.value);
        });
    });
}

// ===== ステップ遷移 =====
function goToStep(step) {
    // バリデーション
    if (step > state.currentStep) {
        if (!validateStep(state.currentStep)) return;
    }

    // 現在のステップを保存
    saveCurrentStepData();

    // UI更新
    document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('step' + step).classList.add('active');

    // プログレスバー更新
    updateProgressBar(step);

    state.currentStep = step;

    // STEP4表示時にプレビュー更新
    if (step === 4 && state.problems.length > 0) {
        renderPreview();
    }

    // ページトップへスクロール
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateStep(step) {
    switch (step) {
        case 1:
            if (!document.getElementById('schoolName').value.trim()) {
                showToast('学校名を入力してください');
                return false;
            }
            if (!document.getElementById('teacherName').value.trim()) {
                showToast('先生のお名前を入力してください');
                return false;
            }
            if (!document.getElementById('grade').value) {
                showToast('対象学年を選んでください');
                return false;
            }
            return true;
        case 2:
            if (!state.subject) {
                showToast('教科を選んでください');
                return false;
            }
            if (!document.getElementById('theme').value.trim()) {
                showToast('テーマ・単元を入力してください');
                return false;
            }
            return true;
        case 3:
            if (state.formats.length === 0) {
                showToast('問題形式を1つ以上選んでください');
                return false;
            }
            if (!state.difficulty) {
                showToast('難易度を選んでください');
                return false;
            }
            if (!state.count) {
                showToast('問題数を選んでください');
                return false;
            }
            return true;
        default:
            return true;
    }
}

function saveCurrentStepData() {
    state.schoolName = document.getElementById('schoolName').value.trim();
    state.teacherName = document.getElementById('teacherName').value.trim();
    state.grade = document.getElementById('grade').value;
    state.theme = document.getElementById('theme').value.trim();
    state.notes = document.getElementById('notes').value.trim();
    state.title = document.getElementById('worksheetTitle').value.trim();
}

function updateProgressBar(activeStep) {
    document.querySelectorAll('.progress-step').forEach(s => {
        const step = parseInt(s.dataset.step);
        s.classList.remove('active', 'completed');
        if (step === activeStep) {
            s.classList.add('active');
        } else if (step < activeStep) {
            s.classList.add('completed');
        }
    });

    // ライン更新
    const lines = document.querySelectorAll('.progress-line');
    lines.forEach((line, i) => {
        line.classList.toggle('active', i < activeStep - 1);
    });
}

// ===== タイトル提案 =====
async function suggestTitle() {
    saveCurrentStepData();

    if (!state.subject || !state.theme) {
        showToast('教科とテーマを先に入力してください');
        return;
    }

    const btn = document.getElementById('suggestTitleBtn');
    btn.disabled = true;
    btn.textContent = '⏳ 提案中...';

    try {
        const res = await fetch('/api/suggest-title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grade: state.grade,
                subject: state.subject,
                theme: state.theme
            })
        });
        const data = await res.json();
        const suggestionsDiv = document.getElementById('titleSuggestions');

        if (data.titles && data.titles.length > 0) {
            suggestionsDiv.innerHTML = data.titles.map(t =>
                `<div class="title-suggestion" onclick="selectTitle(this)">${t}</div>`
            ).join('');
            suggestionsDiv.style.display = 'flex';
        }
    } catch (e) {
        showToast('タイトル提案でエラーが発生しました');
    } finally {
        btn.disabled = false;
        btn.textContent = '✨ AI提案';
    }
}

function selectTitle(el) {
    document.getElementById('worksheetTitle').value = el.textContent;
    document.getElementById('titleSuggestions').style.display = 'none';
    state.title = el.textContent;
}

// ===== ワークシート生成 =====
async function generateWorksheet() {
    if (!validateStep(3)) return;
    saveCurrentStepData();

    showLoading(true);
    const genBtn = document.getElementById('generateBtn');
    genBtn.querySelector('.btn-text').style.display = 'none';
    genBtn.querySelector('.btn-loading').style.display = 'inline-flex';
    genBtn.disabled = true;

    try {
        const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grade: state.grade,
                subject: state.subject,
                theme: state.theme,
                notes: state.notes,
                formats: state.formats,
                difficulty: state.difficulty,
                count: state.count
            })
        });

        const data = await res.json();

        if (data.error) {
            showToast(data.error);
            return;
        }

        state.problems = data.problems || [];
        if (!state.title && data.title) {
            state.title = data.title;
            document.getElementById('worksheetTitle').value = data.title;
        }

        renderPreview();
        goToStep(4);

    } catch (e) {
        showToast('生成中にエラーが発生しました。もう一度お試しください。');
    } finally {
        showLoading(false);
        genBtn.querySelector('.btn-text').style.display = 'inline-flex';
        genBtn.querySelector('.btn-loading').style.display = 'none';
        genBtn.disabled = false;
    }
}

// ===== プレビューレンダリング =====
function renderPreview() {
    const themeClass = 'theme-' + state.colorTheme;

    // テーマクラス更新
    document.getElementById('studentPage').className = 'a4-page ' + themeClass;
    document.getElementById('answerPage').className = 'a4-page ' + themeClass;

    // ヘッダー情報
    document.getElementById('printSchoolName').textContent = state.schoolName;
    document.getElementById('printTeacherName').textContent = state.teacherName + ' 先生';
    document.getElementById('printTitle').textContent = state.title || state.theme + ' ワークシート';
    document.getElementById('printTitleAnswer').textContent = state.title || state.theme + ' ワークシート';
    document.getElementById('printGrade').textContent = state.grade;
    document.getElementById('printSubject').textContent = state.subject;
    document.getElementById('printDifficulty').textContent = state.difficulty;

    // 生徒用問題
    const problemsContainer = document.getElementById('problemsContainer');
    problemsContainer.innerHTML = state.problems.map((p, i) => renderProblem(p, i)).join('');

    // 解答
    const answersContainer = document.getElementById('answersContainer');
    answersContainer.innerHTML = state.problems.map((p, i) => renderAnswer(p, i)).join('');
}

function renderProblem(problem, index) {
    const num = circledNumbers[index] || (index + 1);
    let choicesHTML = '';
    let answerSpaceHTML = '';
    const type = problem.type || '';

    if (problem.choices && problem.choices.length > 0) {
        if (type.includes('○×')) {
            choicesHTML = `<div class="problem-choices" style="grid-template-columns: 1fr 1fr;">
                ${problem.choices.map((c, ci) =>
                `<div class="problem-choice"><span class="problem-choice-label">${c}</span></div>`
            ).join('')}
            </div>`;
        } else if (type.includes('マッチング')) {
            choicesHTML = `<div class="problem-choices" style="grid-template-columns: 1fr;">
                ${problem.choices.map((c, ci) =>
                `<div class="problem-choice">・${c}</div>`
            ).join('')}
            </div>`;
        } else if (type.includes('並べ替え')) {
            choicesHTML = `<div class="problem-choices" style="grid-template-columns: 1fr;">
                ${problem.choices.map((c, ci) =>
                `<div class="problem-choice">[ ${c} ]</div>`
            ).join('')}
            </div>`;
            answerSpaceHTML = '<div class="answer-space"></div>';
        } else {
            const labels = ['ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク'];
            choicesHTML = `<div class="problem-choices">
                ${problem.choices.map((c, ci) =>
                `<div class="problem-choice"><span class="problem-choice-label">${labels[ci]}.</span> ${c}</div>`
            ).join('')}
            </div>`;
        }
    }

    // 解答欄
    if (type.includes('一問一答') || type.includes('穴埋め') || type.includes('短答')) {
        answerSpaceHTML = '<div class="answer-space"></div>';
    } else if (type.includes('長文')) {
        answerSpaceHTML = '<div class="answer-space large"></div>';
    } else if (!choicesHTML && !answerSpaceHTML) {
        answerSpaceHTML = '<div class="answer-space"></div>';
    }

    return `<div class="problem-item" data-index="${index}">
        <div class="problem-actions no-print">
            <button class="problem-action-btn" title="この問題を再生成" onclick="regenerateOne(${index})">🔄</button>
            <button class="problem-action-btn" title="上へ移動" onclick="moveProblem(${index}, -1)">↑</button>
            <button class="problem-action-btn" title="下へ移動" onclick="moveProblem(${index}, 1)">↓</button>
            <button class="problem-action-btn danger" title="削除" onclick="deleteProblem(${index})">✕</button>
        </div>
        <div class="problem-header">
            <span class="problem-number">${num}</span>
            <div class="problem-question" contenteditable="true"
                 oninput="updateProblemText(${index}, this.textContent)">${problem.question}</div>
        </div>
        ${choicesHTML}
        ${answerSpaceHTML}
    </div>`;
}

function renderAnswer(problem, index) {
    const num = circledNumbers[index] || (index + 1);
    return `<div class="answer-item">
        <div class="answer-header">
            <span class="answer-number">${num}</span>
            <div class="answer-content">
                <div class="answer-value">答え：${problem.answer}</div>
                ${problem.explanation ? `<div class="answer-explanation">📖 ${problem.explanation}</div>` : ''}
            </div>
        </div>
    </div>`;
}

// ===== 問題操作 =====
function updateProblemText(index, text) {
    if (state.problems[index]) {
        state.problems[index].question = text;
    }
}

function moveProblem(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= state.problems.length) return;

    const temp = state.problems[index];
    state.problems[index] = state.problems[newIndex];
    state.problems[newIndex] = temp;

    // 番号を更新
    state.problems.forEach((p, i) => { p.number = i + 1; });

    renderPreview();
    showToast('問題の順番を変更しました');
}

function deleteProblem(index) {
    if (state.problems.length <= 1) {
        showToast('最低1問は必要です');
        return;
    }

    if (!confirm(`問題${index + 1}を削除しますか？`)) return;

    state.problems.splice(index, 1);
    state.problems.forEach((p, i) => { p.number = i + 1; });

    renderPreview();
    showToast('問題を削除しました');
}

async function regenerateOne(index) {
    const problem = state.problems[index];
    showLoading(true);

    try {
        const res = await fetch('/api/regenerate-one', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grade: state.grade,
                subject: state.subject,
                theme: state.theme,
                notes: state.notes,
                formats: state.formats,
                difficulty: state.difficulty,
                problemNumber: index + 1,
                currentQuestion: problem.question
            })
        });

        const data = await res.json();

        if (data.error) {
            showToast(data.error);
            return;
        }

        data.number = index + 1;
        state.problems[index] = data;
        renderPreview();
        showToast(`問題${index + 1}を再生成しました`);

    } catch (e) {
        showToast('再生成中にエラーが発生しました');
    } finally {
        showLoading(false);
    }
}

async function regenerateAll() {
    if (!confirm('すべての問題を再生成しますか？')) return;
    saveCurrentStepData();
    showLoading(true);

    try {
        const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grade: state.grade,
                subject: state.subject,
                theme: state.theme,
                notes: state.notes,
                formats: state.formats,
                difficulty: state.difficulty,
                count: state.count
            })
        });

        const data = await res.json();

        if (data.error) {
            showToast(data.error);
            return;
        }

        state.problems = data.problems || [];
        renderPreview();
        showToast('すべての問題を再生成しました');

    } catch (e) {
        showToast('再生成中にエラーが発生しました');
    } finally {
        showLoading(false);
    }
}

// ===== 配色テーマ切り替え =====
function changeColorTheme(theme) {
    state.colorTheme = theme;
    renderPreview();
}

// ===== 印刷 =====
function printStudentWorksheet() {
    document.body.classList.add('print-student-only');
    prepareForPrint();
    window.print();
    document.body.classList.remove('print-student-only');
    restoreAfterPrint();
}

function printTeacherAnswer() {
    document.body.classList.add('print-answer-only');
    prepareForPrint();
    window.print();
    document.body.classList.remove('print-answer-only');
    restoreAfterPrint();
}

function prepareForPrint() {
    // 印刷対象（STEP4）を確実に表示
    document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('step4').classList.add('active');
}

function restoreAfterPrint() {
    // 元のステップ（STEP5）に戻す
    document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('step5').classList.add('active');
}

// 念のためafterprintでもクラスをクリア
window.addEventListener('afterprint', () => {
    document.body.classList.remove('print-student-only', 'print-answer-only');
});

// ===== もう1セット作る =====
function createAnother() {
    state.problems = [];
    state.title = '';
    document.getElementById('worksheetTitle').value = '';
    goToStep(1);
    showToast('新しいワークシートを作成できます');
}

// ===== ユーティリティ =====
function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

function showToast(message) {
    // 既存のトーストを削除
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}
