/**
 * 대시보드 공통 유틸리티 함수들
 * @fileoverview 대시보드 전반에서 사용되는 유틸리티 함수들을 제공합니다
 */

import { CSS_CLASSES, UI_CONFIG, ELEMENT_IDS } from './config.js';

/**
 * 쿠키 값 가져오기
 * @param {string} name - 쿠키 이름
 * @returns {string|null} 쿠키 값 또는 null
 */
export const getCookie = (name) => {
    if (!document.cookie) return null;
    
    const cookies = document.cookie.split(';');
    const targetCookie = cookies.find(cookie => {
        const trimmed = cookie.trim();
        return trimmed.startsWith(`${name}=`);
    });
    
    return targetCookie 
        ? decodeURIComponent(targetCookie.split('=')[1])
        : null;
};

/**
 * HTML 문자열 이스케이프
 * @param {string} text - 이스케이프할 텍스트
 * @returns {string} 이스케이프된 텍스트
 */
export const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/'/g, '&#39;');
};

/**
 * 디바운스 함수
 * @param {Function} func - 실행할 함수
 * @param {number} wait - 대기 시간 (ms)
 * @returns {Function} 디바운스된 함수
 */
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * 지연 실행 유틸리티
 * @param {number} ms - 지연 시간 (밀리초)
 * @returns {Promise} 지연 완료 프로미스
 */
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * DOM 요소 선택 헬퍼
 * @param {string} selector - CSS 선택자
 * @param {Element} [parent=document] - 부모 요소
 * @returns {Element|null} 선택된 요소
 */
export const $ = (selector, parent = document) => parent.querySelector(selector);

/**
 * 여러 DOM 요소 선택 헬퍼
 * @param {string} selector - CSS 선택자
 * @param {Element} [parent=document] - 부모 요소
 * @returns {NodeList} 선택된 요소들
 */
export const $$ = (selector, parent = document) => parent.querySelectorAll(selector);

/**
 * 슬롯 관련 유틸리티 클래스
 */
export class SlotUtils {
    /**
     * 슬롯 인덱스를 시간 문자열로 변환
     * @param {number} slotIndex - 슬롯 인덱스 (0-143)
     * @returns {string} 시간 문자열 (예: "09:30")
     */
    static indexToTimeString(slotIndex) {
        const totalMinutes = slotIndex * 10;
        const hour = Math.floor(totalMinutes / 60);
        const minute = totalMinutes % 60;
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }
    
    /**
     * 슬롯 인덱스를 시간 범위로 변환
     * @param {number} slotIndex - 슬롯 인덱스
     * @returns {string} 시간 범위 (예: "09:30-09:40")
     */
    static indexToTimeRange(slotIndex) {
        const start = this.indexToTimeString(slotIndex);
        const end = this.indexToTimeString(slotIndex + 1);
        return `${start}-${end}`;
    }
    
    /**
     * 연속된 슬롯들을 그룹화
     * @param {number[]} slotIndexes - 슬롯 인덱스 배열
     * @returns {number[][]} 연속된 슬롯 그룹들
     */
    static groupConsecutiveSlots(slotIndexes) {
        if (!slotIndexes.length) return [];
        
        const sorted = [...slotIndexes].sort((a, b) => a - b);
        const groups = [];
        let currentGroup = [sorted[0]];
        
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] === sorted[i - 1] + 1) {
                currentGroup.push(sorted[i]);
            } else {
                groups.push(currentGroup);
                currentGroup = [sorted[i]];
            }
        }
        groups.push(currentGroup);
        
        return groups;
    }
    
    /**
     * 슬롯 개수를 시간 문자열로 변환
     * @param {number} slotCount - 슬롯 개수
     * @returns {string} 시간 문자열 (예: "2시간 30분")
     */
    static slotsToTimeString(slotCount) {
        const totalMinutes = slotCount * 10;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        if (hours === 0 && minutes === 0) return '0시간 0분';
        if (hours === 0) return `${minutes}분`;
        if (minutes === 0) return `${hours}시간`;
        return `${hours}시간 ${minutes}분`;
    }
}

/**
 * 색상 관련 유틸리티 클래스
 */
export class ColorUtils {
    /**
     * HEX 색상 코드 검증
     * @param {string} color - 색상 코드
     * @returns {boolean} 유효성 여부
     */
    static isValidHex(color) {
        return /^#[0-9A-Fa-f]{6}$/.test(color);
    }
    
    /**
     * 색상 밝기 계산 (0-255)
     * @param {string} hexColor - HEX 색상 코드
     * @returns {number} 밝기 값
     */
    static getBrightness(hexColor) {
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        return ((r * 299) + (g * 587) + (b * 114)) / 1000;
    }
    
    /**
     * 색상에 따른 텍스트 색상 결정
     * @param {string} bgColor - 배경 색상
     * @returns {string} 텍스트 색상 ('white' 또는 'black')
     */
    static getContrastColor(bgColor) {
        return this.getBrightness(bgColor) > 128 ? 'black' : 'white';
    }
}

/**
 * 날짜 관련 유틸리티 클래스
 */
export class DateUtils {
    /**
     * 날짜를 YYYY-MM-DD 형식으로 변환
     * @param {Date} date - 날짜 객체
     * @returns {string} 형식화된 날짜 문자열
     */
    static formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    
    /**
     * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
     * @returns {string} 오늘 날짜
     */
    static today() {
        return this.formatDate(new Date());
    }
    
    /**
     * 날짜 문자열을 Date 객체로 변환
     * @param {string} dateString - 날짜 문자열 (YYYY-MM-DD)
     * @returns {Date} Date 객체
     */
    static parseDate(dateString) {
        return new Date(dateString + 'T00:00:00');
    }
}

/**
 * 로딩 상태 관리 클래스
 */
export class LoadingManager {
    /**
     * 요소에 로딩 스피너 표시
     * @param {HTMLElement} element - 대상 요소
     * @param {boolean} show - 표시 여부
     */
    static showSpinner(element, show = true) {
        if (!element) return;
        
        if (show) {
            element.innerHTML = `
                <div class="text-center">
                    <div class="${CSS_CLASSES.LOADING_SPINNER}"></div>
                </div>
            `;
        }
    }
    
    /**
     * 버튼 로딩 상태 설정
     * @param {HTMLButtonElement} button - 대상 버튼
     * @param {boolean} loading - 로딩 여부
     * @param {string} [loadingText='처리 중...'] - 로딩 텍스트
     */
    static setButtonLoading(button, loading, loadingText = '처리 중...') {
        if (!button) return;
        
        if (loading) {
            button.dataset.originalText = button.textContent;
            button.disabled = true;
            button.innerHTML = `<div class="${CSS_CLASSES.LOADING_SPINNER} me-2"></div>${loadingText}`;
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || '확인';
            delete button.dataset.originalText;
        }
    }
}

/**
 * 알림 관리 클래스
 */
export class NotificationManager {
    /**
     * 성공 알림 표시
     * @param {string} message - 메시지 내용
     */
    static showSuccess(message) {
        this._showNotification(message, 'success');
    }
    
    /**
     * 에러 알림 표시
     * @param {string} message - 에러 메시지
     */
    static showError(message) {
        this._showNotification(message, 'danger');
    }
    
    /**
     * 경고 알림 표시
     * @param {string} message - 경고 메시지
     */
    static showWarning(message) {
        this._showNotification(message, 'warning');
    }
    
    /**
     * 확인 대화상자 표시
     * @param {string} message - 확인 메시지
     * @returns {boolean} 사용자 선택
     */
    static confirm(message) {
        return confirm(message);
    }
    
    /**
     * 알림 표시 (내부 메서드)
     * @param {string} message - 메시지
     * @param {string} type - 알림 타입
     * @private
     */
    static _showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} position-fixed`;
        notification.style.cssText = `
            top: 20px; 
            right: 20px; 
            z-index: 9999; 
            animation: ${CSS_CLASSES.FADE_IN_OUT} ${UI_CONFIG.NOTIFICATION_DURATION}ms forwards;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        const iconMap = {
            success: 'check-circle',
            danger: 'exclamation-triangle',
            warning: 'exclamation-circle'
        };
        
        notification.innerHTML = `
            <i class="fas fa-${iconMap[type]} me-2"></i>
            ${escapeHtml(message)}
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, UI_CONFIG.NOTIFICATION_DURATION);
    }
}

/**
 * 모달 관리 유틸리티 클래스
 */
export class ModalUtils {
    /**
     * 안전한 모달 생성
     * @param {string} modalId - 모달 ID
     * @returns {Promise<bootstrap.Modal|null>} 모달 인스턴스
     */
    static async createSafeModal(modalId) {
        return new Promise((resolve) => {
            // DOM 완전 로드 확인
            if (document.readyState !== 'complete') {
                setTimeout(() => {
                    resolve(this.createSafeModal(modalId));
                }, UI_CONFIG.MODAL_RETRY_DELAY);
                return;
            }
            
            // Bootstrap 로드 확인
            if (typeof bootstrap === 'undefined') {
                console.error('Bootstrap이 아직 로드되지 않았습니다.');
                resolve(null);
                return;
            }
            
            this._findAndCreateModal(modalId, resolve);
        });
    }
    
    /**
     * 모달 요소 찾기 및 생성 (내부 메서드)
     * @param {string} modalId - 모달 ID
     * @param {Function} resolve - Promise resolve 함수
     * @param {number} attempts - 시도 횟수
     * @private
     */
    static _findAndCreateModal(modalId, resolve, attempts = 0) {
        const modalElement = document.getElementById(modalId);
        
        if (modalElement) {
            try {
                // 기존 모달 인스턴스 제거
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
            if (attempts < UI_CONFIG.MODAL_RETRY_ATTEMPTS) {
                setTimeout(() => {
                    this._findAndCreateModal(modalId, resolve, attempts + 1);
                }, UI_CONFIG.MODAL_RETRY_DELAY);
            } else {
                console.error(`모달 요소를 찾을 수 없습니다: ${modalId}`);
                resolve(null);
            }
        }
    }
}

/**
 * 폼 관련 유틸리티 클래스
 */
export class FormUtils {
    /**
     * 색상 입력 필드 동기화 설정
     * @param {string} colorInputId - 색상 입력 필드 ID
     * @param {string} textInputId - 텍스트 입력 필드 ID
     */
    static setupColorSync(colorInputId, textInputId) {
        const colorInput = $(colorInputId);
        const textInput = $(textInputId);
        
        if (!colorInput || !textInput) return;
        
        // 색상 입력 → 텍스트 입력 동기화
        colorInput.addEventListener('input', function() {
            textInput.value = this.value;
        });
        
        // 텍스트 입력 → 색상 입력 동기화 (유효한 색상일 때만)
        textInput.addEventListener('input', function() {
            if (ColorUtils.isValidHex(this.value)) {
                colorInput.value = this.value;
            }
        });
    }
    
    /**
     * 폼 초기화
     * @param {HTMLFormElement} form - 폼 요소
     */
    static resetForm(form) {
        if (form) {
            form.reset();
        }
    }
    
    /**
     * 입력 필드에 포커스
     * @param {string} inputId - 입력 필드 ID
     */
    static focusInput(inputId) {
        const input = $(inputId);
        if (input) {
            setTimeout(() => input.focus(), 100);
        }
    }
} 