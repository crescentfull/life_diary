/**
 * 공통 유틸리티 함수들
 * @fileoverview 애플리케이션 전반에서 사용되는 유틸리티 함수들을 제공합니다
 */

import { CSS_CLASSES } from './config.js';

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
 * 입력값 검증 유틸리티
 */
export class Validator {
    /**
     * 태그명 검증
     * @param {string} name - 태그명
     * @returns {{isValid: boolean, message: string}} 검증 결과
     */
    static validateTagName(name) {
        if (!name || !name.trim()) {
            return { isValid: false, message: '태그명을 입력해주세요.' };
        }
        
        const trimmedName = name.trim();
        if (trimmedName.length > 50) {
            return { isValid: false, message: '태그명은 50자 이하로 입력해주세요.' };
        }
        
        return { isValid: true, message: '' };
    }
    
    /**
     * 색상 코드 검증
     * @param {string} color - 색상 코드
     * @returns {{isValid: boolean, message: string}} 검증 결과
     */
    static validateColor(color) {
        const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        
        if (!colorRegex.test(color)) {
            return { isValid: false, message: '올바른 색상 코드를 입력해주세요.' };
        }
        
        return { isValid: true, message: '' };
    }
}

/**
 * 로딩 상태 관리 클래스
 */
export class LoadingManager {
    /**
     * 로딩 스피너 표시
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
 * 메시지 표시 클래스
 */
export class MessageManager {
    /**
     * 성공 메시지 표시
     * @param {string} message - 메시지 내용
     */
    static showSuccess(message) {
        console.log('✅ 성공:', message);
        // TODO: 향후 토스트 메시지로 개선 예정
        alert(message);
    }
    
    /**
     * 에러 메시지 표시
     * @param {string} message - 에러 메시지
     */
    static showError(message) {
        console.error('❌ 오류:', message);
        alert(`오류: ${message}`);
    }
    
    /**
     * 확인 대화상자 표시
     * @param {string} message - 확인 메시지
     * @returns {boolean} 사용자 선택
     */
    static confirm(message) {
        return confirm(message);
    }
} 