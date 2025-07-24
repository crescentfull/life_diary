/**
 * 유틸리티 함수들
 */

class StatsUtils {
    constructor() {
        this.config = window.StatsConfig || {};
    }
    
    /**
     * 날짜를 YYYY-MM-DD 형식으로 포맷
     * @param {Date} date - 포맷할 날짜
     * @returns {string} 포맷된 날짜 문자열
     */
    formatDate(date) {
        if (!date) return null;
        
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }
    
    /**
     * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
     * @returns {string} 오늘 날짜
     */
    getTodayString() {
        return this.formatDate(new Date());
    }
    
    /**
     * 날짜 문자열을 한국어 형식으로 변환
     * @param {string} dateString - YYYY-MM-DD 형식의 날짜 문자열
     * @returns {string} 한국어 날짜 형식
     */
    formatDateKorean(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        
        return `${year}년 ${month}월 ${day}일`;
    }
    
    /**
     * 날짜 범위 검증
     * @param {string} startDate - 시작 날짜
     * @param {string} endDate - 종료 날짜
     * @returns {boolean} 유효한 범위 여부
     */
    isValidDateRange(startDate, endDate) {
        if (!startDate || !endDate) return false;
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return start <= end;
    }
    
    /**
     * 시간을 시:분 형식으로 포맷
     * @param {number} hours - 시간 (소수점 포함)
     * @returns {string} 포맷된 시간 문자열
     */
    formatHours(hours) {
        if (!hours || isNaN(hours)) return '0시간';
        
        const wholeHours = Math.floor(hours);
        const minutes = Math.round((hours - wholeHours) * 60);
        
        if (minutes === 0) {
            return `${wholeHours}시간`;
        } else if (wholeHours === 0) {
            return `${minutes}분`;
        } else {
            return `${wholeHours}시간 ${minutes}분`;
        }
    }
    
    /**
     * 분을 시간으로 변환
     * @param {number} minutes - 분
     * @returns {number} 시간 (소수점 포함)
     */
    minutesToHours(minutes) {
        return minutes / 60;
    }
    
    /**
     * 시간을 분으로 변환
     * @param {number} hours - 시간
     * @returns {number} 분
     */
    hoursToMinutes(hours) {
        return hours * 60;
    }
    
    /**
     * 퍼센트 값을 포맷
     * @param {number} value - 퍼센트 값
     * @param {number} decimals - 소수점 자릿수
     * @returns {string} 포맷된 퍼센트 문자열
     */
    formatPercent(value, decimals = 1) {
        if (!value || isNaN(value)) return '0%';
        return `${value.toFixed(decimals)}%`;
    }
    
    /**
     * 숫자를 천 단위 구분자와 함께 포맷
     * @param {number} number - 포맷할 숫자
     * @returns {string} 포맷된 숫자 문자열
     */
    formatNumber(number) {
        if (!number || isNaN(number)) return '0';
        return number.toLocaleString('ko-KR');
    }
    
    /**
     * 배열이 비어있는지 확인
     * @param {Array} array - 확인할 배열
     * @returns {boolean} 비어있는지 여부
     */
    isEmptyArray(array) {
        return !array || !Array.isArray(array) || array.length === 0;
    }
    
    /**
     * 객체가 비어있는지 확인
     * @param {Object} obj - 확인할 객체
     * @returns {boolean} 비어있는지 여부
     */
    isEmptyObject(obj) {
        return !obj || typeof obj !== 'object' || Object.keys(obj).length === 0;
    }
    
    /**
     * 깊은 복사
     * @param {*} obj - 복사할 객체
     * @returns {*} 복사된 객체
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }
    
    /**
     * 디바운스 함수
     * @param {Function} func - 실행할 함수
     * @param {number} wait - 대기 시간 (밀리초)
     * @returns {Function} 디바운스된 함수
     */
    debounce(func, wait) {
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
    
    /**
     * 색상 투명도 조절
     * @param {string} color - 색상 (hex 또는 rgb)
     * @param {number} alpha - 투명도 (0-1)
     * @returns {string} rgba 색상
     */
    addAlphaToColor(color, alpha) {
        if (!color) return 'rgba(0,0,0,0)';
        
        // hex 색상인 경우
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        
        // 이미 rgba인 경우
        if (color.startsWith('rgba')) {
            return color.replace(/[\d\.]+\)$/g, `${alpha})`);
        }
        
        // rgb인 경우
        if (color.startsWith('rgb')) {
            return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
        }
        
        return color;
    }
    
    /**
     * 배열에서 최대값과 최소값 찾기
     * @param {Array} array - 숫자 배열
     * @returns {Object} {min, max}
     */
    getMinMax(array) {
        if (this.isEmptyArray(array)) {
            return { min: 0, max: 0 };
        }
        
        const numbers = array.filter(item => typeof item === 'number' && !isNaN(item));
        if (numbers.length === 0) {
            return { min: 0, max: 0 };
        }
        
        return {
            min: Math.min(...numbers),
            max: Math.max(...numbers)
        };
    }
    
    /**
     * 데이터 합계 계산
     * @param {Array} array - 숫자 배열
     * @returns {number} 합계
     */
    sum(array) {
        if (this.isEmptyArray(array)) return 0;
        
        return array
            .filter(item => typeof item === 'number' && !isNaN(item))
            .reduce((sum, item) => sum + item, 0);
    }
    
    /**
     * 데이터 평균 계산
     * @param {Array} array - 숫자 배열
     * @returns {number} 평균
     */
    average(array) {
        if (this.isEmptyArray(array)) return 0;
        
        const numbers = array.filter(item => typeof item === 'number' && !isNaN(item));
        if (numbers.length === 0) return 0;
        
        return this.sum(numbers) / numbers.length;
    }
    
    /**
     * 로컬 스토리지에 데이터 저장
     * @param {string} key - 저장할 키
     * @param {*} data - 저장할 데이터
     */
    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.warn('로컬 스토리지 저장 실패:', error);
        }
    }
    
    /**
     * 로컬 스토리지에서 데이터 불러오기
     * @param {string} key - 불러올 키
     * @param {*} defaultValue - 기본값
     * @returns {*} 불러온 데이터
     */
    loadFromLocalStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn('로컬 스토리지 불러오기 실패:', error);
            return defaultValue;
        }
    }
    
    /**
     * URL에서 쿼리 파라미터 추출
     * @param {string} param - 파라미터 이름
     * @returns {string|null} 파라미터 값
     */
    getUrlParameter(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }
    
    /**
     * URL에 쿼리 파라미터 추가
     * @param {string} param - 파라미터 이름
     * @param {string} value - 파라미터 값
     */
    setUrlParameter(param, value) {
        const url = new URL(window.location);
        url.searchParams.set(param, value);
        window.history.replaceState({}, '', url);
    }
}

// 전역 인스턴스 생성
if (typeof window !== 'undefined') {
    window.statsUtils = new StatsUtils();
} 