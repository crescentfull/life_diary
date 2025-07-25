/**
 * =================================================================================
 * 태그 관리 공통 JavaScript
 * - 이 스크립트는 _tag_modal.html과 함께 사용되어야 합니다.
 * - 태그 폼 모달을 열고, 태그를 생성/수정/삭제하는 API를 호출합니다.
 * - 작업 성공 시 'tags-updated' 커스텀 이벤트를 발생시켜 각 페이지에서
 *   태그 목록을 새로고침하도록 합니다.
 * - core/utils.js의 apiCall과 showNotification 함수를 사용합니다.
 * =================================================================================
 */

document.addEventListener('DOMContentLoaded', function() {
    const tagFormModalEl = document.getElementById('tagFormModal');
    if (!tagFormModalEl) return; // 모달이 없는 페이지에서는 실행하지 않음

    const tagFormModal = new bootstrap.Modal(tagFormModalEl);
    
    // 색상 입력 동기화 로직 추가
    const colorPicker = document.getElementById('tagFormColor');
    const colorText = document.getElementById('tagFormColorText');

    if(colorPicker && colorText) {
        colorPicker.addEventListener('input', () => colorText.value = colorPicker.value);
        colorText.addEventListener('input', () => {
            if (/^#[0-9a-fA-F]{6}$/.test(colorText.value)) {
                colorPicker.value = colorText.value;
            }
        });
    }

    // 전역 함수로 모달 열기 함수 등록
    window.openTagFormModal = function(tag = null) {
        const form = document.getElementById('tagForm');
        form.reset();
        
        const titleEl = document.getElementById('tagFormModalTitle');
        const tagIdInput = document.getElementById('tagFormTagId');
        const nameInput = document.getElementById('tagFormName');
        const colorInput = document.getElementById('tagFormColor');
        const colorTextInput = document.getElementById('tagFormColorText');
        const isDefaultCheckbox = document.getElementById('tagFormIsDefault');

        if (tag) {
            // 태그 수정
            titleEl.textContent = '태그 수정';
            tagIdInput.value = tag.id;
            nameInput.value = tag.name;
            colorInput.value = tag.color;
            colorTextInput.value = tag.color; // 텍스트 필드 값도 설정
            if (isDefaultCheckbox) {
                isDefaultCheckbox.checked = tag.is_default || false;
            }
        } else {
            // 새 태그 생성
            titleEl.textContent = '새 태그 생성';
            tagIdInput.value = '';
            const defaultColor = '#007bff';
            colorInput.value = defaultColor;
            colorTextInput.value = defaultColor; // 텍스트 필드 값도 설정
             if (isDefaultCheckbox) {
                isDefaultCheckbox.checked = false;
            }
        }
        
        tagFormModal.show();
    };

    // 저장 버튼 클릭 이벤트 (core utils 사용)
    document.getElementById('saveTagFormBtn').addEventListener('click', async function() {
        const tagId = document.getElementById('tagFormTagId').value;
        const name = document.getElementById('tagFormName').value.trim();
        const color = document.getElementById('tagFormColor').value; // 색상 선택기의 최종 값을 사용
        const isDefaultEl = document.getElementById('tagFormIsDefault');
        const is_default = isDefaultEl ? isDefaultEl.checked : false;

        if (!name) {
            showNotification('태그명을 입력해주세요.', 'warning');
            return;
        }

        const url = tagId ? `/api/tags/${tagId}/` : '/api/tags/';
        const method = tagId ? 'PUT' : 'POST';
        const saveBtn = this;

        try {
            const result = await apiCall(url, {
                method: method,
                data: { name, color, is_default },
                loadingElement: saveBtn
            });

            tagFormModal.hide();
            showNotification(result.message, 'success');
            // 태그 목록 업데이트가 필요하다는 이벤트를 발생시킴
            document.dispatchEvent(new CustomEvent('tags-updated'));
            
        } catch (error) {
            console.error('태그 저장 오류:', error);
            showNotification(`태그 저장 실패: ${error.message}`, 'error');
        }
    });

    // 전역 함수로 태그 삭제 함수 등록 (core utils 사용)
    window.deleteTag = async function(tagId, tagName) {
        if (!confirm(`'${tagName}' 태그를 정말 삭제하시겠습니까?`)) {
            return;
        }

        try {
            const result = await apiCall(`/api/tags/${tagId}/`, {
                method: 'DELETE'
            });
            
            showNotification(result.message, 'success');
            // 태그 목록 업데이트가 필요하다는 이벤트를 발생시킴
            document.dispatchEvent(new CustomEvent('tags-updated'));
            
        } catch (error) {
            console.error('태그 삭제 오류:', error);
            showNotification(`태그 삭제 실패: ${error.message}`, 'error');
        }
    };
}); 