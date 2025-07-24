// Dashboard JavaScript
// dashboard 페이지의 모든 상호작용 기능을 담당합니다.

// 전역 변수들
let selectedSlots = new Set(); // 선택된 슬롯들을 저장하는 Set
let selectedTag = null;
let isDragging = false;
let startSlot = null;
let availableTags = []; // 사용 가능한 태그 목록

// 유틸리티 함수들
/**
 * 색상 입력 필드 동기화 설정
 * @param {string} colorInputId - 색상 입력 필드 ID
 * @param {string} textInputId - 텍스트 입력 필드 ID
 */
function setupColorSync(colorInputId, textInputId) {
    const colorInput = document.getElementById(colorInputId);
    const textInput = document.getElementById(textInputId);
    
    if (!colorInput || !textInput) return;
    
    // 색상 입력 → 텍스트 입력 동기화
    colorInput.addEventListener('input', function() {
        textInput.value = this.value;
    });
    
    // 텍스트 입력 → 색상 입력 동기화 (유효한 색상일 때만)
    textInput.addEventListener('input', function() {
        if (this.value.match(/^#[0-9A-Fa-f]{6}$/)) {
            colorInput.value = this.value;
        }
    });
}

/**
 * API 호출을 위한 공통 함수
 * @param {string} url - API URL
 * @param {string} method - HTTP 메소드
 * @param {Object} data - 전송할 데이터
 * @returns {Promise} API 응답
 */
async function apiCall(url, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        }
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        
        // 응답 상태 코드 확인
        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('권한이 없습니다. 페이지를 새로고침해주세요.');
            } else if (response.status === 404) {
                throw new Error('요청한 리소스를 찾을 수 없습니다.');
            } else if (response.status >= 500) {
                throw new Error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
            }
        }
        
        const result = await response.json();
        
        // 응답이 정상이 아닌 경우에도 성공 여부 확인
        if (result.success === false) {
            throw new Error(result.message || '알 수 없는 오류가 발생했습니다.');
        }
        
        return result;
    } catch (error) {
        console.error('API 호출 오류:', error);
        
        // 네트워크 오류인 경우
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('네트워크 연결을 확인해주세요.');
        }
        
        throw error;
    }
}

/**
 * CSRF 토큰 가져오기
 */
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

/**
 * 알림 표시 함수
 */
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; animation: fadeInOut 3s forwards;';
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
        ${message}
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard 초기화 시작');
    
    initializeEventListeners();
    loadAvailableTags();
    setupColorSyncronization();
});

/**
 * 이벤트 리스너 초기화
 */
function initializeEventListeners() {
    // 날짜 선택기
    const dateSelector = document.getElementById('dateSelector');
    if (dateSelector) {
        dateSelector.addEventListener('change', (event) => {
            const selectedDate = event.target.value;
            const url = new URL(window.location);
            url.searchParams.set('date', selectedDate);
            window.location.href = url.toString();
        });
    }
    
    // 태그 관련 버튼들
    const createBtn = document.getElementById('createNewTagBtn');
    const manageBtn = document.getElementById('manageTagsBtn');
    
    if (createBtn) {
        createBtn.addEventListener('click', () => window.openCreateTagModal());
    }
    
    if (manageBtn) {
        manageBtn.addEventListener('click', () => window.openManageTagModal());
    }
    
    // 태그 저장 버튼 (편집)
    const saveTagBtn = document.getElementById('saveTagBtn');
    if (saveTagBtn) {
        saveTagBtn.addEventListener('click', handleTagEdit);
    }
    
    // 전역 마우스 이벤트
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('mouseleave', endDrag);
}

/**
 * 색상 동기화 설정
 */
function setupColorSyncronization() {
    setupColorSync('newTagColor', 'newTagColorText');
    setupColorSync('editTagColor', 'editTagColorText');
}

/**
 * 태그 편집 처리
 */
async function handleTagEdit() {
    const tagIdInput = document.getElementById('editTagId');
    const nameInput = document.getElementById('editTagName');
    const colorInput = document.getElementById('editTagColor');
    
    if (!tagIdInput || !nameInput || !colorInput) {
        alert('편집 폼 요소를 찾을 수 없습니다.');
        return;
    }
    
    const tagId = tagIdInput.value;
    const name = nameInput.value.trim();
    const color = colorInput.value;
    
    if (!name) {
        alert('태그명을 입력해주세요.');
        return;
    }
    
    try {
        const result = await apiCall(`/tags/api/tags/${tagId}/`, 'PUT', { name, color });
        
        if (result.success) {
            // 태그 목록 새로고침
            if (window.loadTagList) loadTagList();
            refreshTagList();
            
            // 성공 표시
            const editForm = document.getElementById('editTagForm');
            if (editForm) {
                editForm.style.border = '2px solid #28a745';
                setTimeout(() => {
                    editForm.style.border = '';
                }, 2000);
            }
            
            // 모달 닫기
            setTimeout(() => {
                const editModal = document.getElementById('tagEditModal');
                if (editModal) {
                    const modalInstance = bootstrap.Modal.getInstance(editModal);
                    if (modalInstance) modalInstance.hide();
                }
            }, 2000);
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('태그 수정 오류:', error);
        alert('태그 수정 중 오류가 발생했습니다.');
    }
}

// 안전한 모달 생성 함수 (개선된 버전)
function createSafeModal(modalId) {
    return new Promise((resolve) => {
        // DOM이 완전히 로드되었는지 확인
        if (document.readyState !== 'complete') {
            console.log('DOM이 아직 완전히 로드되지 않았습니다. 잠시 기다립니다...');
            setTimeout(() => {
                resolve(createSafeModal(modalId));
            }, 100);
            return;
        }
        
        // Bootstrap이 로드되었는지 확인
        if (typeof bootstrap === 'undefined') {
            console.error('Bootstrap이 아직 로드되지 않았습니다.');
            alert('페이지가 완전히 로드될 때까지 잠시 기다려주세요.');
            resolve(null);
            return;
        }
        
        // 모달 요소 확인 (최대 5초 동안 재시도)
        let attempts = 0;
        const maxAttempts = 50; // 5초
        
        const findModal = () => {
            const modalElement = document.getElementById(modalId);
            
            if (modalElement) {
                console.log(`모달 요소 찾음: ${modalId}`);
                
                try {
                    // 기존 모달 인스턴스가 있다면 제거
                    const existingModal = bootstrap.Modal.getInstance(modalElement);
                    if (existingModal) {
                        existingModal.dispose();
                    }
                    
                    // 새 모달 인스턴스 생성
                    const modal = new bootstrap.Modal(modalElement, {
                        backdrop: true,
                        keyboard: true,
                        focus: true
                    });
                    
                    resolve(modal);
                } catch (error) {
                    console.error('모달 생성 중 오류:', error);
                    resolve(null);
                }
            } else {
                attempts++;
                if (attempts < maxAttempts) {
                    console.log(`모달 요소를 찾는 중... (${attempts}/${maxAttempts})`);
                    setTimeout(findModal, 100);
                } else {
                    console.error(`모달 요소를 찾을 수 없습니다: ${modalId} (${maxAttempts}번 시도 후 포기)`);
                    alert('모달을 열 수 없습니다. 페이지를 새로고침해보세요.');
                    resolve(null);
                }
            }
        };
        
        findModal();
    });
}

// 전역 함수들 (onclick 이벤트용) - Promise 방식으로 업데이트
window.openCreateTagModal = async function() {
    console.log('🔥 openCreateTagModal 호출됨 - 새 태그 추가 모달');
    
    try {
        const modal = await createSafeModal('createTagModal');
        if (!modal) {
            console.error('새 태그 모달 생성 실패');
            return;
        }
        
        const modalElement = document.getElementById('createTagModal');
        if (!modalElement) {
            console.error('새 태그 모달 요소를 찾을 수 없습니다');
            return;
        }
        
        // 모달이 완전히 열린 후 실행
        modalElement.addEventListener('shown.bs.modal', function() {
            console.log('새 태그 모달이 완전히 열림');
            
            // 새 태그 생성 폼 이벤트 리스너 등록
            setupCreateTagForm();
            
            // 새 태그 이름 입력란에 포커스
            setTimeout(() => {
                const nameInput = document.getElementById('newTagName');
                if (nameInput) nameInput.focus();
            }, 100);
        }, { once: true }); // 한 번만 실행
        
        modal.show();
    } catch (error) {
        console.error('새 태그 모달 열기 중 오류:', error);
        alert('새 태그 모달을 열 수 없습니다. 페이지를 새로고침해보세요.');
    }
};

window.openManageTagModal = async function() {
    console.log('🔥 openManageTagModal 호출됨 - 태그 관리 모달');
    
    try {
        const modal = await createSafeModal('tagManageModal');
        if (!modal) {
            console.error('태그 관리 모달 생성 실패');
            return;
        }
        
        const modalElement = document.getElementById('tagManageModal');
        if (!modalElement) {
            console.error('태그 관리 모달 요소를 찾을 수 없습니다');
            return;
        }
        
        // 모달이 완전히 열린 후 실행
        modalElement.addEventListener('shown.bs.modal', function() {
            console.log('태그 관리 모달이 완전히 열림 - 태그 목록 로드 시작');
            if (window.loadTagList) loadTagList();
        }, { once: true }); // 한 번만 실행
        
        modal.show();
    } catch (error) {
        console.error('태그 관리 모달 열기 중 오류:', error);
        alert('태그 관리 모달을 열 수 없습니다. 페이지를 새로고침해보세요.');
    }
};

// 새 태그 생성 폼 설정 함수
function setupCreateTagForm() {
    const createTagForm = document.getElementById('createTagForm');
    const newTagColor = document.getElementById('newTagColor');
    const newTagColorText = document.getElementById('newTagColorText');
    
    if (!createTagForm) {
        console.error('createTagForm을 찾을 수 없습니다.');
        return;
    }
    
    // 색상 입력 동기화
    if (newTagColor && newTagColorText) {
        // 기존 이벤트 리스너 제거 (중복 방지)
        newTagColor.replaceWith(newTagColor.cloneNode(true));
        newTagColorText.replaceWith(newTagColorText.cloneNode(true));
        
        // 새로운 참조 가져오기
        const colorInput = document.getElementById('newTagColor');
        const colorTextInput = document.getElementById('newTagColorText');
        
        colorInput.addEventListener('input', function() {
            colorTextInput.value = this.value;
        });
        
        colorTextInput.addEventListener('input', function() {
            if (this.value.match(/^#[0-9A-Fa-f]{6}$/)) {
                colorInput.value = this.value;
            }
        });
    }
    
    // 폼 제출 이벤트 리스너
    createTagForm.replaceWith(createTagForm.cloneNode(true)); // 기존 이벤트 제거
    const newForm = document.getElementById('createTagForm');
    
    newForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('새 태그 생성 폼 제출됨');
        
        const nameInput = document.getElementById('newTagName');
        const colorInput = document.getElementById('newTagColor');
        const colorTextInput = document.getElementById('newTagColorText');
        
        if (!nameInput || !colorInput) {
            alert('폼 요소를 찾을 수 없습니다.');
            return;
        }
        
        const name = nameInput.value.trim();
        const color = colorInput.value;
        
        if (!name) {
            alert('태그명을 입력해주세요.');
            return;
        }
        
        try {
                const response = await fetch('/tags/api/tags/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ name, color })
    });
            
            const result = await response.json();
            
            if (result.success) {
                // 폼 초기화
                nameInput.value = '';
                colorInput.value = '#3498db';
                if (colorTextInput) colorTextInput.value = '#3498db';
                
                // 메인 페이지의 태그 목록 새로고침
                refreshTagList();
                
                // 성공 메시지 표시 (console.log)
                console.log('태그 생성 성공:', result.message);
                
                // 성공 표시를 위한 시각적 피드백
                newForm.style.border = '2px solid #28a745';
                setTimeout(() => {
                    newForm.style.border = '';
                }, 2000);
                
                // 2초 후 모달 닫기
                setTimeout(() => {
                    const createModal = document.getElementById('createTagModal');
                    if (createModal) {
                        const modalInstance = bootstrap.Modal.getInstance(createModal);
                        if (modalInstance) modalInstance.hide();
                    }
                }, 2000);
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('태그 생성 오류:', error);
            alert('태그 생성 중 오류가 발생했습니다.');
        }
    });
    
    console.log('새 태그 생성 폼 이벤트 리스너 등록 완료');
}

// 태그 목록 로드 함수 (전역 함수로 추가)
window.loadTagList = async function loadTagList() {
    console.log('태그 목록 로드 시작');
    
    const tagListElement = document.getElementById('tagList');
    if (!tagListElement) {
        console.error('tagList 요소를 찾을 수 없습니다. 모달이 아직 준비되지 않았습니다.');
        return;
    }
    
    try {
        const response = await fetch('/tags/api/tags/');
        const result = await response.json();
        
        console.log('태그 API 응답:', result);
        
        if (result.success) {
            renderTagList(result.tags);
            console.log('태그 목록 렌더링 완료');
        } else {
            tagListElement.innerHTML = 
                `<div class="alert alert-danger">태그 로드 실패: ${result.message}</div>`;
        }
    } catch (error) {
        console.error('태그 로드 오류:', error);
        if (tagListElement) {
            tagListElement.innerHTML = 
                '<div class="alert alert-danger">태그 로드 중 오류가 발생했습니다.</div>';
        }
    }
};

// 태그 목록 렌더링 함수
function renderTagList(tags) {
    const tagList = document.getElementById('tagList');
    
    if (!tagList) {
        console.error('tagList 요소를 찾을 수 없습니다. 모달이 아직 로드되지 않았을 수 있습니다.');
        return;
    }
    
    if (tags.length === 0) {
        tagList.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-tags text-muted mb-3" style="font-size: 2rem;"></i>
                <p class="text-muted mb-3">등록된 태그가 없습니다.</p>
                <button class="btn btn-primary btn-sm" onclick="window.openCreateTagModal()">
                    <i class="fas fa-plus me-1"></i>
                    첫 번째 태그 만들기
                </button>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="mb-0">
                <i class="fas fa-list me-2"></i>내 태그 목록 (${tags.length}개)
            </h6>
            <button class="btn btn-sm btn-outline-success" onclick="window.openCreateTagModal()">
                <i class="fas fa-plus me-1"></i>새 태그 추가
            </button>
        </div>
    `;
    
    tags.forEach(tag => {
        html += `
            <div class="d-flex align-items-center justify-content-between mb-2 p-3 border rounded">
                <div class="d-flex align-items-center">
                    <span class="badge me-3" style="background-color: ${tag.color}; width: 20px; height: 20px;">&nbsp;</span>
                    <div>
                        <span class="fw-bold">${tag.name}</span>
                        ${tag.is_default ? '<small class="text-muted ms-2">(기본 태그)</small>' : ''}
                    </div>
                </div>
                <div>
                    ${tag.can_edit ? `
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editTag(${tag.id}, '${tag.name}', '${tag.color}')" title="편집">
                            <i class="fas fa-edit"></i>
                        </button>
                    ` : ''}
                    ${tag.can_delete ? `
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteTag(${tag.id}, '${tag.name}')" title="삭제">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    tagList.innerHTML = html;
}

// 태그 편집 모달 열기 (전역 함수로 추가) - Promise 방식으로 업데이트
window.editTag = async function editTag(tagId, tagName, tagColor) {
    try {
        const editTagIdInput = document.getElementById('editTagId');
        const editTagNameInput = document.getElementById('editTagName');
        const editTagColorInput = document.getElementById('editTagColor');
        const editTagColorTextInput = document.getElementById('editTagColorText');
        
        if (!editTagIdInput || !editTagNameInput || !editTagColorInput || !editTagColorTextInput) {
            console.error('태그 편집 폼 요소를 찾을 수 없습니다.');
            alert('태그 편집 폼이 준비되지 않았습니다. 페이지를 새로고침해주세요.');
            return;
        }
        
        editTagIdInput.value = tagId;
        editTagNameInput.value = tagName;
        editTagColorInput.value = tagColor;
        editTagColorTextInput.value = tagColor;
        
        const modal = await createSafeModal('tagEditModal');
        if (modal) {
            modal.show();
        } else {
            console.error('태그 편집 모달 생성 실패');
            alert('태그 편집 모달을 열 수 없습니다. 페이지를 새로고침해보세요.');
        }
    } catch (error) {
        console.error('태그 편집 모달 열기 중 오류:', error);
        alert('태그 편집 모달을 열 수 없습니다. 페이지를 새로고침해보세요.');
    }
};

// 태그 삭제 (전역 함수로 추가)
window.deleteTag = async function deleteTag(tagId, tagName) {
    if (!confirm(`"${tagName}" 태그를 삭제하시겠습니까?\n\n※ 사용 중인 태그는 삭제할 수 없습니다.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/tags/api/tags/${tagId}/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadTagList();
            alert(result.message);
            refreshTagList();
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('태그 삭제 오류:', error);
        alert('태그 삭제 중 오류가 발생했습니다.');
    }
};

// 기타 함수들
const goToToday = () => {
    const url = new URL(window.location);
    url.searchParams.delete('date');
    window.location.href = url.toString();
};

// 슬롯 선택 (단일 클릭)
const selectSlot = (slotIndex) => {
    if (isDragging) return; // 드래그 중이면 무시
    
    const slotElement = document.querySelector(`[data-slot-index="${slotIndex}"]`);
    if (!slotElement) return;
    
    // Ctrl/Cmd 키가 눌렸는지 확인
    const isMultiSelect = event.ctrlKey || event.metaKey;
    
    if (!isMultiSelect) {
        // 단일 선택: 모든 선택 해제 후 새로 선택
        clearSelection();
        selectedSlots.add(slotIndex);
        slotElement.classList.add('selected');
    } else {
        // 다중 선택: 토글
        if (selectedSlots.has(slotIndex)) {
            selectedSlots.delete(slotIndex);
            slotElement.classList.remove('selected');
        } else {
            selectedSlots.add(slotIndex);
            slotElement.classList.add('selected');
        }
    }
    
    // 슬롯 정보 표시
    showSlotInfo(Array.from(selectedSlots));
    
    // 버튼 활성화
    updateButtons();
};

// 선택 해제
const clearSelection = () => {
    selectedSlots.clear();
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
};

// 드래그 시작
const startDrag = (slotIndex) => {
    isDragging = true;
    startSlot = slotIndex;
    
    // 기존 선택 해제
    clearSelection();
    selectedSlots.add(slotIndex);
    
    const slotElement = document.querySelector(`[data-slot-index="${slotIndex}"]`);
    slotElement?.classList.add('selected');
    
    // 마우스 이벤트 방지
    event.preventDefault();
};

// 드래그 중
const dragOver = (slotIndex) => {
    if (!isDragging || startSlot === null) return;
    
    // 시작점과 현재점 사이의 모든 슬롯 선택
    const start = Math.min(startSlot, slotIndex);
    const end = Math.max(startSlot, slotIndex);
    
    // 기존 선택 해제
    clearSelection();
    
    // 범위 내 모든 슬롯 선택
    for (let i = start; i <= end; i++) {
        selectedSlots.add(i);
        const slotElement = document.querySelector(`[data-slot-index="${i}"]`);
        slotElement?.classList.add('selected');
    }
    
    showSlotInfo(Array.from(selectedSlots));
    updateButtons();
};

// 드래그 종료
const endDrag = () => {
    if (isDragging) {
        isDragging = false;
        startSlot = null;
        
        // 최종 선택 상태 업데이트
        showSlotInfo(Array.from(selectedSlots));
        updateButtons();
    }
};

// 터치 이벤트 처리
const handleTouchMove = (event) => {
    if (!isDragging) return;
    
    event.preventDefault();
    const touch = event.touches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (elementBelow && elementBelow.classList.contains('time-slot')) {
        const slotIndex = parseInt(elementBelow.dataset.slotIndex);
        if (!isNaN(slotIndex)) {
            dragOver(slotIndex);
        }
    }
};

// 전역 마우스 이벤트 리스너
document.addEventListener('mouseup', endDrag);
document.addEventListener('mouseleave', endDrag);

// 슬롯 정보 표시 (다중 선택 지원)
const showSlotInfo = (slotIndexes) => {
    if (!slotIndexes || slotIndexes.length === 0) {
        const slotInfoCard = document.getElementById('slotInfoCard');
        if (slotInfoCard) slotInfoCard.style.display = 'none';
        return;
    }
    
    let infoHTML = '';
    let memoHTML = '';
    
    if (slotIndexes.length === 1) {
        // 단일 슬롯 정보
        const slotIndex = slotIndexes[0];
        const slotElement = document.querySelector(`[data-slot-index="${slotIndex}"]`);
        if (!slotElement) return;
        
        const totalMinutes = slotIndex * 10;
        const hour = Math.floor(totalMinutes / 60);
        const minute = totalMinutes % 60;
        const endTotalMinutes = (slotIndex + 1) * 10;
        const endHour = Math.floor(endTotalMinutes / 60);
        const endMinute = endTotalMinutes % 60;
        
        const timeRange = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} - ${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        
        // 슬롯 데이터에서 메모 가져오기
        const selectedDate = document.getElementById('dateSelector')?.value || new Date().toISOString().split('T')[0];
        
        // 태그 이름 추출
        let tagName = '';
        if (slotElement.classList.contains('filled')) {
            // title에서 태그명만 추출 (형태: "시간 - 태그명" 또는 "시간 - 태그명: 메모")
            const titleParts = slotElement.title.split(' - ');
            if (titleParts.length > 1) {
                const tagPart = titleParts[1];
                // 메모가 있으면 콜론 앞부분만 가져오기
                tagName = tagPart.split(':')[0];
            }
        }
        
        infoHTML = `
            <div class="mb-2">
                <strong>시간:</strong> ${timeRange}
            </div>
            <div class="mb-2">
                <strong>상태:</strong> 
                ${slotElement.classList.contains('filled') ? tagName : '<span class="text-muted">빈 슬롯</span>'}
            </div>
        `;
        
        // 단일 슬롯의 메모 확인을 위해 API 호출
        if (slotElement.classList.contains('filled')) {
            fetch(`/dashboard/api/blocks/${slotIndex}/?date=${selectedDate}`)
                .then(response => response.json())
                .then(data => {
                    if (data.exists && data.memo) {
                        const slotInfoCard = document.getElementById('slotInfoCard');
                        if (slotInfoCard) {
                            const existingMemo = slotInfoCard.querySelector('.slot-memo');
                            if (existingMemo) {
                                existingMemo.remove();
                            }
                            
                            const memoDiv = document.createElement('div');
                            memoDiv.className = 'mt-2 p-2 bg-light rounded slot-memo';
                            memoDiv.innerHTML = `<strong>메모:</strong> ${data.memo}`;
                            slotInfoCard.querySelector('.card-body').appendChild(memoDiv);
                        }
                    }
                })
                .catch(error => console.error('메모 로드 오류:', error));
        }
    } else {
        // 다중 슬롯 정보
        const sortedSlots = slotIndexes.sort((a, b) => a - b);
        const startSlot = sortedSlots[0];
        const endSlot = sortedSlots[sortedSlots.length - 1];
        
        const startTotalMinutes = startSlot * 10;
        const startHour = Math.floor(startTotalMinutes / 60);
        const startMinute = startTotalMinutes % 60;
        
        const endTotalMinutes = (endSlot + 1) * 10;
        const endHour = Math.floor(endTotalMinutes / 60);
        const endMinute = endTotalMinutes % 60;
        
        const timeRange = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')} - ${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        const totalDuration = slotIndexes.length * 10;
        const durationHours = Math.floor(totalDuration / 60);
        const durationMinutes = totalDuration % 60;
        
        infoHTML = `
            <div class="mb-2">
                <strong>선택된 슬롯:</strong> ${slotIndexes.length}개
            </div>
            <div class="mb-2">
                <strong>시간 범위:</strong> ${timeRange}
            </div>
            <div class="mb-2">
                <strong>총 시간:</strong> ${durationHours}시간 ${durationMinutes}분
            </div>
        `;
    }
    
    const slotInfoElement = document.getElementById('slotInfo');
    const slotInfoCard = document.getElementById('slotInfoCard');
    
    if (slotInfoElement && slotInfoCard) {
        // 기존 메모 제거
        const existingMemo = slotInfoCard.querySelector('.slot-memo');
        if (existingMemo) {
            existingMemo.remove();
        }
        
        slotInfoElement.innerHTML = infoHTML;
        slotInfoCard.style.display = 'block';
    }
};

// 버튼 상태 업데이트
const updateButtons = () => {
    const saveBtn = document.getElementById('saveBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    
    if (saveBtn) {
        saveBtn.disabled = !(selectedSlots.size > 0 && selectedTag !== null);
    }
    
    if (deleteBtn) {
        // 선택된 슬롯 중 하나라도 채워져 있으면 삭제 버튼 활성화
        const hasFilledSlot = Array.from(selectedSlots).some(slotIndex => {
            const slotElement = document.querySelector(`[data-slot-index="${slotIndex}"]`);
            return slotElement?.classList.contains('filled');
        });
        deleteBtn.disabled = !(selectedSlots.size > 0 && hasFilledSlot);
    }
};
    
const selectTag = (tagId, tagColor, tagName) => {
    // 이전 선택 해제
    document.querySelectorAll('.tag-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 새 선택 적용
    event.target.classList.add('active');
    
    selectedTag = {
        id: tagId,
        color: tagColor,
        name: tagName
    };
    
    updateButtons();
};

// 슬롯 저장 함수 개선 - 새로운 RESTful API 사용
const saveSlot = async () => {
    if (selectedSlots.size === 0 || selectedTag === null) {
        alert('슬롯과 태그를 선택해주세요.');
        return;
    }
    
    const memoInput = document.getElementById('memoInput');
    const memo = memoInput?.value || '';
    const selectedDate = document.getElementById('dateSelector')?.value || new Date().toISOString().split('T')[0];
    
    try {
        const result = await apiCall('/dashboard/api/blocks/', 'POST', {
            slot_indexes: Array.from(selectedSlots),
            tag_id: selectedTag.id,
            memo: memo,
            date: selectedDate
        });
        
        if (result.success) {
            // UI 업데이트
            selectedSlots.forEach(slotIndex => {
                const slotElement = document.querySelector(`[data-slot-index="${slotIndex}"]`);
                if (!slotElement) return;
                
                slotElement.style.backgroundColor = selectedTag.color;
                slotElement.classList.add('filled');
                slotElement.title = `${slotElement.dataset.time} - ${selectedTag.name}${memo ? ': ' + memo : ''}`;
                
                slotElement.innerHTML = `
                    <div class="position-absolute w-100 h-100 d-flex align-items-center justify-content-center">
                        <small class="text-white fw-bold" style="text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
                            ${selectedTag.name.substring(0, 3)}
                        </small>
                    </div>
                `;
            });
            
            // 상태 초기화
            resetUI();
            showNotification(result.message);
        } else {
            alert('저장 실패: ' + result.message);
        }
    } catch (error) {
        console.error('저장 중 오류:', error);
        alert('저장 중 오류가 발생했습니다.');
    }
};

// 슬롯 삭제 함수 개선 - 새로운 RESTful API 사용
const deleteSlot = async () => {
    if (selectedSlots.size === 0) {
        alert('삭제할 슬롯을 선택해주세요.');
        return;
    }
    
    const filledSlots = Array.from(selectedSlots).filter(slotIndex => {
        const slotElement = document.querySelector(`[data-slot-index="${slotIndex}"]`);
        return slotElement?.classList.contains('filled');
    });
    
    if (filledSlots.length === 0) {
        alert('삭제할 수 있는 기록된 슬롯이 없습니다.');
        return;
    }
    
    if (confirm(`${filledSlots.length}개의 기록된 슬롯을 삭제하시겠습니까?`)) {
        const selectedDate = document.getElementById('dateSelector')?.value || new Date().toISOString().split('T')[0];
        
        try {
            const result = await apiCall('/dashboard/api/blocks/', 'DELETE', {
                slot_indexes: filledSlots,
                date: selectedDate
            });
            
            if (result.success) {
                // UI 업데이트
                filledSlots.forEach(slotIndex => {
                    const slotElement = document.querySelector(`[data-slot-index="${slotIndex}"]`);
                    if (!slotElement) return;
                    
                    slotElement.style.backgroundColor = '';
                    slotElement.classList.remove('filled');
                    slotElement.title = `${slotElement.dataset.time} - 빈 슬롯`;
                    slotElement.innerHTML = '';
                });
                
                resetUI();
                alert(result.message);
                window.location.reload(); // 통계 업데이트
            } else {
                alert('삭제 실패: ' + result.message);
            }
        } catch (error) {
            console.error('삭제 중 오류:', error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    }
};

/**
 * UI 상태 초기화
 */
function resetUI() {
    const memoInput = document.getElementById('memoInput');
    if (memoInput) memoInput.value = '';
    
    clearSelection();
    selectedTag = null;
    
    document.querySelectorAll('.tag-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    updateButtons();
    
    const slotInfoCard = document.getElementById('slotInfoCard');
    if (slotInfoCard) slotInfoCard.style.display = 'none';
}

// 나머지 기존 함수들은 유지...
// (슬롯 선택, 드래그, 태그 관련 함수들)

// 태그 로딩 및 렌더링 기능
async function loadAvailableTags() {
    try {
        const response = await fetch('/tags/api/tags/');
        const result = await response.json();
        
        if (result.success) {
            availableTags = result.tags;
            renderTagContainer(result.tags);
            renderTagLegend(result.tags);
        } else {
            showTagError('태그 로드 실패: ' + result.message);
        }
    } catch (error) {
        console.error('태그 로드 오류:', error);
        showTagError('태그 로드 중 오류가 발생했습니다.');
    }
}

function renderTagContainer(tags) {
    const tagContainer = document.getElementById('tagContainer');
    
    if (tags.length === 0) {
        tagContainer.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-tags text-muted mb-3" style="font-size: 2rem;"></i>
                <p class="text-muted mb-3">태그를 먼저 생성해주세요.</p>
                <button class="btn btn-primary btn-sm" id="createFirstTagBtn">
                    <i class="fas fa-plus me-1"></i>
                    첫 번째 태그 만들기
                </button>
            </div>
        `;
        
        document.getElementById('createFirstTagBtn').addEventListener('click', function() {
            if (window.openCreateTagModal) {
                window.openCreateTagModal();
            }
        });
        return;
    }
    
    let html = '';
    tags.forEach(tag => {
        html += `
            <button class="btn btn-outline-secondary btn-sm tag-btn" 
                    data-tag-id="${tag.id}"
                    data-tag-color="${tag.color}"
                    data-is-default="${tag.is_default}"
                    onclick="selectTag(${tag.id}, '${tag.color}', '${tag.name}')">
                <span class="badge me-2" style="background-color: ${tag.color};">&nbsp;</span>
                ${tag.name}
                ${tag.is_default ? '<small class="text-muted ms-1">(기본)</small>' : ''}
            </button>
        `;
    });
    
    tagContainer.innerHTML = html;
}

function renderTagLegend(tags) {
    const tagLegend = document.getElementById('tagLegend');
    
    if (tags.length === 0) {
        tagLegend.innerHTML = `
            <small class="text-muted">
                <i class="fas fa-info-circle me-1"></i>
                태그를 먼저 생성해주세요.
            </small>
        `;
        return;
    }
    
    let html = '';
    tags.forEach(tag => {
        html += `
            <span class="badge" style="background-color: ${tag.color};">
                ${tag.name}
            </span>
        `;
    });
    
    tagLegend.innerHTML = html;
}

function showTagError(message) {
    const tagContainer = document.getElementById('tagContainer');
    const tagLegend = document.getElementById('tagLegend');
    
    const errorHtml = `
        <div class="alert alert-danger alert-sm">
            <i class="fas fa-exclamation-triangle me-1"></i>
            ${message}
            <button class="btn btn-sm btn-outline-danger ms-2" onclick="loadAvailableTags()">
                <i class="fas fa-redo"></i> 다시 시도
            </button>
        </div>
    `;
    
    tagContainer.innerHTML = errorHtml;
    tagLegend.innerHTML = '<small class="text-danger">태그 로드 실패</small>';
}

function refreshTagList() {
    loadAvailableTags();
} 