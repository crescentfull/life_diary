/**
 * 슬롯 관리자
 * @fileoverview 슬롯 선택, 드래그, 저장, 삭제 기능을 담당하는 클래스입니다
 */

import { CSS_CLASSES, ELEMENT_IDS, MESSAGES, KEYBOARD } from './config.js';
import { SlotUtils, DateUtils, NotificationManager, $, $$ } from './utils.js';
import { slotApi } from './api.js';

/**
 * 슬롯 상태 관리 클래스
 */
class SlotState {
    constructor() {
        this.selectedSlots = new Set();
        this.selectedTag = null;
        this.isDragging = false;
        this.startSlot = null;
    }

    /**
     * 선택된 슬롯 추가
     * @param {number} slotIndex - 슬롯 인덱스
     */
    addSelectedSlot(slotIndex) {
        this.selectedSlots.add(slotIndex);
    }

    /**
     * 선택된 슬롯 제거
     * @param {number} slotIndex - 슬롯 인덱스
     */
    removeSelectedSlot(slotIndex) {
        this.selectedSlots.delete(slotIndex);
    }

    /**
     * 모든 선택 해제
     */
    clearSelection() {
        this.selectedSlots.clear();
    }

    /**
     * 슬롯이 선택되었는지 확인
     * @param {number} slotIndex - 슬롯 인덱스
     * @returns {boolean} 선택 여부
     */
    isSelected(slotIndex) {
        return this.selectedSlots.has(slotIndex);
    }

    /**
     * 선택된 슬롯 배열 반환
     * @returns {number[]} 선택된 슬롯 인덱스 배열
     */
    getSelectedSlots() {
        return Array.from(this.selectedSlots);
    }

    /**
     * 선택된 슬롯 개수 반환
     * @returns {number} 선택된 슬롯 개수
     */
    getSelectedCount() {
        return this.selectedSlots.size;
    }

    /**
     * 선택된 태그 설정
     * @param {Object} tag - 태그 객체
     */
    setSelectedTag(tag) {
        this.selectedTag = tag;
    }

    /**
     * 드래그 상태 설정
     * @param {boolean} isDragging - 드래그 여부
     * @param {number} [startSlot] - 시작 슬롯
     */
    setDragging(isDragging, startSlot = null) {
        this.isDragging = isDragging;
        this.startSlot = startSlot;
    }
}

/**
 * 슬롯 관리 클래스
 */
export class SlotManager {
    constructor(statisticsUpdater = null) {
        this.state = new SlotState();
        this.statisticsUpdater = statisticsUpdater;
        this.eventListeners = new Map();
        
        this._initializeEventListeners();
    }

    /**
     * 이벤트 리스너 초기화
     * @private
     */
    _initializeEventListeners() {
        // 전역 이벤트
        this._addEventListener(document, 'mouseup', this._handleGlobalMouseUp.bind(this));
        this._addEventListener(document, 'keydown', this._handleKeyDown.bind(this));
    }

    /**
     * 이벤트 리스너 추가 (메모리 관리용)
     * @param {Element} element - 이벤트 대상 요소
     * @param {string} event - 이벤트 타입
     * @param {Function} handler - 이벤트 핸들러
     * @private
     */
    _addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
        
        const key = `${element.tagName || 'document'}_${event}`;
        if (!this.eventListeners.has(key)) {
            this.eventListeners.set(key, []);
        }
        this.eventListeners.get(key).push({ element, event, handler });
    }

    /**
     * 슬롯 선택 (단일 클릭)
     * @param {number} slotIndex - 슬롯 인덱스
     * @param {Event} event - 클릭 이벤트
     */
    selectSlot(slotIndex, event) {
        if (this.state.isDragging) return;
        
        const slotElement = this._getSlotElement(slotIndex);
        if (!slotElement) return;
        
        // Ctrl/Cmd 키가 눌렸는지 확인
        const isMultiSelect = event[KEYBOARD.CTRL] || event[KEYBOARD.META];
        
        if (!isMultiSelect) {
            // 단일 선택: 모든 선택 해제 후 새로 선택
            this.clearSelection();
            this.state.addSelectedSlot(slotIndex);
            slotElement.classList.add(CSS_CLASSES.SELECTED_SLOT);
        } else {
            // 다중 선택: 토글
            if (this.state.isSelected(slotIndex)) {
                this.state.removeSelectedSlot(slotIndex);
                slotElement.classList.remove(CSS_CLASSES.SELECTED_SLOT);
            } else {
                this.state.addSelectedSlot(slotIndex);
                slotElement.classList.add(CSS_CLASSES.SELECTED_SLOT);
            }
        }
        
        this._showSlotInfo();
        this._updateButtons();
    }

    /**
     * 드래그 시작
     * @param {number} slotIndex - 시작 슬롯 인덱스
     */
    startDrag(slotIndex) {
        this.state.setDragging(true, slotIndex);
        
        // 기존 선택 해제 후 시작 슬롯 선택
        this.clearSelection();
        this.state.addSelectedSlot(slotIndex);
        
        const slotElement = this._getSlotElement(slotIndex);
        if (slotElement) {
            slotElement.classList.add(CSS_CLASSES.SELECTED_SLOT);
        }
    }

    /**
     * 드래그 오버
     * @param {number} slotIndex - 현재 슬롯 인덱스
     */
    dragOver(slotIndex) {
        if (!this.state.isDragging || this.state.startSlot === null) return;
        
        // 시작점부터 현재점까지의 모든 슬롯 선택
        const startSlot = this.state.startSlot;
        const endSlot = slotIndex;
        
        this.clearSelection();
        
        const minSlot = Math.min(startSlot, endSlot);
        const maxSlot = Math.max(startSlot, endSlot);
        
        for (let i = minSlot; i <= maxSlot; i++) {
            this.state.addSelectedSlot(i);
            const slotElement = this._getSlotElement(i);
            if (slotElement) {
                slotElement.classList.add(CSS_CLASSES.SELECTED_SLOT);
            }
        }
    }

    /**
     * 드래그 종료
     */
    endDrag() {
        if (this.state.isDragging) {
            this.state.setDragging(false);
            this._showSlotInfo();
            this._updateButtons();
        }
    }

    /**
     * 모든 선택 해제
     */
    clearSelection() {
        this.state.clearSelection();
        $$('.time-slot').forEach(slot => {
            slot.classList.remove(CSS_CLASSES.SELECTED_SLOT);
        });
    }

    /**
     * 태그 선택
     * @param {Object} tag - 태그 객체
     * @param {HTMLElement} buttonElement - 클릭된 버튼 요소
     */
    selectTag(tag, buttonElement) {
        // 이전 선택 해제
        $$(`.${CSS_CLASSES.TAG_BUTTON}`).forEach(btn => {
            btn.classList.remove(CSS_CLASSES.TAG_ACTIVE);
        });
        
        // 새 선택 적용
        if (buttonElement) {
            buttonElement.classList.add(CSS_CLASSES.TAG_ACTIVE);
        }
        
        this.state.setSelectedTag(tag);
        this._updateButtons();
    }

    /**
     * 슬롯 저장
     */
    async saveSlots() {
        if (this.state.getSelectedCount() === 0 || !this.state.selectedTag) {
            NotificationManager.showError(MESSAGES.ERROR.NO_SELECTION);
            return;
        }
        
        const memoInput = $(ELEMENT_IDS.MEMO_INPUT);
        const memo = memoInput?.value || '';
        const selectedDate = this._getCurrentDate();
        
        try {
            const result = await slotApi.saveTimeBlocks({
                slot_indexes: this.state.getSelectedSlots(),
                tag_id: this.state.selectedTag.id,
                memo: memo,
                date: selectedDate
            });
            
            if (result.success) {
                this._updateSlotUI(this.state.getSelectedSlots(), this.state.selectedTag, memo);
                this._resetUI();
                this._triggerStatisticsUpdate();
                NotificationManager.showSuccess(result.message);
            }
        } catch (error) {
            console.error('슬롯 저장 오류:', error);
            NotificationManager.showError(error.message || MESSAGES.ERROR.SAVE_FAILED);
        }
    }

    /**
     * 슬롯 삭제
     */
    async deleteSlots() {
        if (this.state.getSelectedCount() === 0) {
            NotificationManager.showError(MESSAGES.ERROR.NO_SLOTS_TO_DELETE);
            return;
        }
        
        const filledSlots = this._getFilledSlotsFromSelection();
        
        if (filledSlots.length === 0) {
            NotificationManager.showError(MESSAGES.ERROR.NO_FILLED_SLOTS);
            return;
        }
        
        const confirmMessage = `${filledSlots.length}${MESSAGES.CONFIRM.DELETE_SLOTS}`;
        if (!NotificationManager.confirm(confirmMessage)) {
            return;
        }
        
        const selectedDate = this._getCurrentDate();
        
        try {
            const result = await slotApi.deleteTimeBlocks({
                slot_indexes: filledSlots,
                date: selectedDate
            });
            
            if (result.success) {
                this._clearSlotUI(filledSlots);
                this._resetUI();
                this._triggerStatisticsUpdate();
                NotificationManager.showSuccess(result.message);
            }
        } catch (error) {
            console.error('슬롯 삭제 오류:', error);
            NotificationManager.showError(error.message || MESSAGES.ERROR.DELETE_FAILED);
        }
    }

    /**
     * 슬롯 요소 가져오기
     * @param {number} slotIndex - 슬롯 인덱스
     * @returns {HTMLElement|null} 슬롯 요소
     * @private
     */
    _getSlotElement(slotIndex) {
        return $(`[data-slot-index="${slotIndex}"]`);
    }

    /**
     * 선택된 슬롯 중 채워진 슬롯만 반환
     * @returns {number[]} 채워진 슬롯 인덱스 배열
     * @private
     */
    _getFilledSlotsFromSelection() {
        return this.state.getSelectedSlots().filter(slotIndex => {
            const slotElement = this._getSlotElement(slotIndex);
            return slotElement?.classList.contains(CSS_CLASSES.FILLED_SLOT);
        });
    }

    /**
     * 현재 선택된 날짜 반환
     * @returns {string} 날짜 (YYYY-MM-DD)
     * @private
     */
    _getCurrentDate() {
        const dateSelector = $(ELEMENT_IDS.DATE_SELECTOR);
        return dateSelector?.value || DateUtils.today();
    }

    /**
     * 슬롯 UI 업데이트 (저장 후)
     * @param {number[]} slotIndexes - 슬롯 인덱스 배열
     * @param {Object} tag - 태그 객체
     * @param {string} memo - 메모
     * @private
     */
    _updateSlotUI(slotIndexes, tag, memo) {
        slotIndexes.forEach(slotIndex => {
            const slotElement = this._getSlotElement(slotIndex);
            if (!slotElement) return;
            
            slotElement.style.backgroundColor = tag.color;
            slotElement.classList.add(CSS_CLASSES.FILLED_SLOT);
            slotElement.title = `${slotElement.dataset.time} - ${tag.name}${memo ? ': ' + memo : ''}`;
            
            slotElement.innerHTML = `
                <div class="position-absolute w-100 h-100 d-flex align-items-center justify-content-center">
                    <small class="text-white fw-bold" style="text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
                        ${tag.name.substring(0, 3)}
                    </small>
                </div>
            `;
        });
    }

    /**
     * 슬롯 UI 지우기 (삭제 후)
     * @param {number[]} slotIndexes - 슬롯 인덱스 배열
     * @private
     */
    _clearSlotUI(slotIndexes) {
        slotIndexes.forEach(slotIndex => {
            const slotElement = this._getSlotElement(slotIndex);
            if (!slotElement) return;
            
            slotElement.style.backgroundColor = '';
            slotElement.classList.remove(CSS_CLASSES.FILLED_SLOT);
            slotElement.title = `${slotElement.dataset.time} - 빈 슬롯`;
            slotElement.innerHTML = '';
        });
    }

    /**
     * UI 상태 초기화
     * @private
     */
    _resetUI() {
        const memoInput = $(ELEMENT_IDS.MEMO_INPUT);
        if (memoInput) memoInput.value = '';
        
        this.clearSelection();
        this.state.setSelectedTag(null);
        
        // 태그 선택 해제
        $$(`.${CSS_CLASSES.TAG_BUTTON}`).forEach(btn => {
            btn.classList.remove(CSS_CLASSES.TAG_ACTIVE);
        });
        
        this._updateButtons();
    }

    /**
     * 슬롯 정보 표시
     * @private
     */
    _showSlotInfo() {
        const selectedSlots = this.state.getSelectedSlots();
        const slotInfoCard = $(ELEMENT_IDS.SLOT_INFO_CARD);
        const slotInfoElement = $(ELEMENT_IDS.SLOT_INFO);
        
        if (!slotInfoCard || !slotInfoElement) return;
        
        if (selectedSlots.length === 0) {
            slotInfoCard.style.display = 'none';
            return;
        }
        
        let infoHTML = '';
        
        if (selectedSlots.length === 1) {
            // 단일 슬롯 정보
            infoHTML = this._renderSingleSlotInfo(selectedSlots[0]);
        } else {
            // 다중 슬롯 정보
            infoHTML = this._renderMultipleSlotInfo(selectedSlots);
        }
        
        slotInfoElement.innerHTML = infoHTML;
        slotInfoCard.style.display = 'block';
    }

    /**
     * 단일 슬롯 정보 렌더링
     * @param {number} slotIndex - 슬롯 인덱스
     * @returns {string} HTML 문자열
     * @private
     */
    _renderSingleSlotInfo(slotIndex) {
        const timeRange = SlotUtils.indexToTimeRange(slotIndex);
        const slotElement = this._getSlotElement(slotIndex);
        
        let tagName = '';
        if (slotElement?.classList.contains(CSS_CLASSES.FILLED_SLOT)) {
            const titleParts = slotElement.title.split(' - ');
            if (titleParts.length > 1) {
                tagName = titleParts[1].split(':')[0];
            }
        }
        
        return `
            <div class="mb-2">
                <strong>시간:</strong> ${timeRange}
            </div>
            <div class="mb-2">
                <strong>상태:</strong> 
                ${tagName || '<span class="text-muted">빈 슬롯</span>'}
            </div>
        `;
    }

    /**
     * 다중 슬롯 정보 렌더링
     * @param {number[]} selectedSlots - 선택된 슬롯 배열
     * @returns {string} HTML 문자열
     * @private
     */
    _renderMultipleSlotInfo(selectedSlots) {
        const sortedSlots = [...selectedSlots].sort((a, b) => a - b);
        const timeRange = `${SlotUtils.indexToTimeString(sortedSlots[0])} - ${SlotUtils.indexToTimeString(sortedSlots[sortedSlots.length - 1] + 1)}`;
        const durationText = SlotUtils.slotsToTimeString(selectedSlots.length);
        
        return `
            <div class="mb-2">
                <strong>선택된 슬롯:</strong> ${selectedSlots.length}개
            </div>
            <div class="mb-2">
                <strong>시간 범위:</strong> ${timeRange}
            </div>
            <div class="mb-2">
                <strong>총 시간:</strong> ${durationText}
            </div>
        `;
    }

    /**
     * 버튼 상태 업데이트
     * @private
     */
    _updateButtons() {
        const saveBtn = $(ELEMENT_IDS.SAVE_BTN);
        const deleteBtn = $(ELEMENT_IDS.DELETE_BTN);
        
        if (saveBtn) {
            saveBtn.disabled = !(this.state.getSelectedCount() > 0 && this.state.selectedTag !== null);
        }
        
        if (deleteBtn) {
            const hasFilledSlot = this._getFilledSlotsFromSelection().length > 0;
            deleteBtn.disabled = !(this.state.getSelectedCount() > 0 && hasFilledSlot);
        }
    }

    /**
     * 통계 업데이트 트리거
     * @private
     */
    _triggerStatisticsUpdate() {
        if (this.statisticsUpdater) {
            this.statisticsUpdater();
        }
    }

    /**
     * 전역 마우스 업 이벤트 처리
     * @param {Event} event - 마우스 이벤트
     * @private
     */
    _handleGlobalMouseUp(event) {
        if (this.state.isDragging) {
            this.endDrag();
        }
    }

    /**
     * 키보드 이벤트 처리
     * @param {KeyboardEvent} event - 키보드 이벤트
     * @private
     */
    _handleKeyDown(event) {
        if (event.key === KEYBOARD.ESCAPE) {
            this.clearSelection();
            this._updateButtons();
        }
    }

    /**
     * 리소스 정리
     */
    destroy() {
        // 이벤트 리스너 제거
        this.eventListeners.forEach(listeners => {
            listeners.forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
        });
        this.eventListeners.clear();
        
        // 상태 초기화
        this.state = null;
        this.statisticsUpdater = null;
    }
} 