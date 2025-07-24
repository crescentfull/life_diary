/**
 * 통계 관리자
 * @fileoverview 대시보드 통계 계산 및 갱신을 담당하는 클래스입니다
 */

import { SLOT_CONFIG, CSS_CLASSES, ELEMENT_IDS, UI_CONFIG } from './config.js';
import { SlotUtils, debounce, $ } from './utils.js';

/**
 * 통계 데이터 인터페이스
 * @typedef {Object} StatisticsData
 * @property {number} totalSlots - 총 슬롯 수
 * @property {number} filledSlots - 채워진 슬롯 수
 * @property {number} fillPercentage - 채움률 (%)
 * @property {number} totalMinutes - 총 시간 (분)
 * @property {number} totalHours - 총 시간 (시간)
 * @property {number} remainingMinutes - 나머지 분
 */

/**
 * 통계 관리 클래스
 */
export class StatisticsManager {
    constructor() {
        this.lastStats = null;
        this.elements = null;
        this._initializeElements();
    }

    /**
     * DOM 요소들 초기화
     * @private
     */
    _initializeElements() {
        this.elements = {
            totalSlots: $(ELEMENT_IDS.TOTAL_SLOTS),
            filledSlots: $(ELEMENT_IDS.FILLED_SLOTS),
            fillPercentage: $(ELEMENT_IDS.FILL_PERCENTAGE),
            totalTime: $(ELEMENT_IDS.TOTAL_TIME)
        };
    }

    /**
     * 현재 채워진 슬롯 개수 계산
     * @returns {number} 채워진 슬롯 수
     */
    calculateFilledSlots() {
        return document.querySelectorAll(`.${CSS_CLASSES.TIME_SLOT}.${CSS_CLASSES.FILLED_SLOT}`).length;
    }

    /**
     * 통계 데이터 계산
     * @returns {StatisticsData} 계산된 통계 데이터
     */
    calculateStatistics() {
        const filledSlots = this.calculateFilledSlots();
        const totalSlots = SLOT_CONFIG.TOTAL_SLOTS;
        
        const fillPercentage = totalSlots > 0 ? 
            Math.round((filledSlots / totalSlots) * 100 * 10) / 10 : 0;
        
        const totalMinutes = filledSlots * SLOT_CONFIG.SLOT_DURATION;
        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;
        
        return {
            totalSlots,
            filledSlots,
            fillPercentage,
            totalMinutes,
            totalHours,
            remainingMinutes
        };
    }

    /**
     * 통계가 변경되었는지 확인
     * @param {StatisticsData} newStats - 새로운 통계 데이터
     * @returns {boolean} 변경 여부
     * @private
     */
    _hasStatsChanged(newStats) {
        if (!this.lastStats) return true;
        
        return (
            this.lastStats.filledSlots !== newStats.filledSlots ||
            this.lastStats.fillPercentage !== newStats.fillPercentage ||
            this.lastStats.totalHours !== newStats.totalHours ||
            this.lastStats.remainingMinutes !== newStats.remainingMinutes
        );
    }

    /**
     * 통계 UI 갱신 (애니메이션 포함)
     * @param {StatisticsData} [stats] - 계산된 통계 데이터 (선택적)
     */
    updateStatistics(stats = null) {
        // 통계 계산 (전달되지 않은 경우)
        if (!stats) {
            stats = this.calculateStatistics();
        }
        
        // 변경사항이 없으면 스킵
        if (!this._hasStatsChanged(stats)) {
            return;
        }
        
        // DOM 요소 재확인 (동적으로 변경될 수 있음)
        if (!this.elements || !this.elements.filledSlots) {
            this._initializeElements();
        }
        
        // 요소가 없으면 종료
        if (!this.elements.filledSlots || !this.elements.fillPercentage || !this.elements.totalTime) {
            console.warn('통계 표시 요소를 찾을 수 없습니다.');
            return;
        }
        
        // 애니메이션과 함께 값 업데이트
        this._updateElementWithAnimation(this.elements.filledSlots, stats.filledSlots.toString());
        this._updateElementWithAnimation(this.elements.fillPercentage, `${stats.fillPercentage}%`);
        
        const timeText = this._formatTimeText(stats.totalHours, stats.remainingMinutes);
        this._updateElementWithAnimation(this.elements.totalTime, timeText);
        
        // 마지막 통계 업데이트
        this.lastStats = { ...stats };
        
        console.log(`📊 통계 갱신: ${stats.filledSlots}/${stats.totalSlots} (${stats.fillPercentage}%) - ${timeText}`);
    }

    /**
     * 시간 텍스트 포맷팅
     * @param {number} hours - 시간
     * @param {number} minutes - 분
     * @returns {string} 포맷된 시간 텍스트
     * @private
     */
    _formatTimeText(hours, minutes) {
        if (hours === 0 && minutes === 0) return '0시간 0분';
        if (hours === 0) return `${minutes}분`;
        if (minutes === 0) return `${hours}시간`;
        return `${hours}시간 ${minutes}분`;
    }

    /**
     * 요소 값을 애니메이션과 함께 업데이트
     * @param {HTMLElement} element - 업데이트할 요소
     * @param {string} newValue - 새로운 값
     * @private
     */
    _updateElementWithAnimation(element, newValue) {
        if (!element || element.textContent === newValue) return;
        
        // CSS 클래스 기반 애니메이션 적용
        element.classList.add(CSS_CLASSES.STATS_UPDATE);
        
        // 하이라이트 효과
        element.classList.add(CSS_CLASSES.STATS_HIGHLIGHT);
        
        // 값 변경
        element.textContent = newValue;
        
        // 애니메이션 원복
        setTimeout(() => {
            element.classList.remove(CSS_CLASSES.STATS_HIGHLIGHT);
        }, UI_CONFIG.ANIMATION_DURATION + 100);
        
        // 펄스 효과 (선택적)
        if (newValue !== '0' && newValue !== '0%' && newValue !== '0시간 0분') {
            element.style.animation = 'pulse 0.5s ease-in-out';
            setTimeout(() => {
                element.style.animation = '';
            }, 500);
        }
    }

    /**
     * 통계 초기화
     */
    initialize() {
        // 초기 통계 계산 및 표시
        this.updateStatistics();
        console.log('📊 통계 시스템 초기화 완료');
    }

    /**
     * 통계 강제 새로고침
     */
    refresh() {
        this.lastStats = null; // 캐시 초기화
        this.updateStatistics();
    }

    /**
     * 통계 데이터를 JSON으로 반환
     * @returns {StatisticsData} 현재 통계 데이터
     */
    getStatisticsData() {
        return this.calculateStatistics();
    }

    /**
     * 통계 요약 문자열 반환
     * @returns {string} 통계 요약
     */
    getSummary() {
        const stats = this.calculateStatistics();
        const timeText = this._formatTimeText(stats.totalHours, stats.remainingMinutes);
        return `${stats.filledSlots}개 슬롯 (${stats.fillPercentage}%) - ${timeText}`;
    }

    /**
     * 시간대별 통계 계산
     * @returns {Array<number>} 24시간별 슬롯 개수 배열
     */
    calculateHourlyStatistics() {
        const hourlyStats = new Array(24).fill(0);
        const filledSlots = document.querySelectorAll(`.${CSS_CLASSES.TIME_SLOT}.${CSS_CLASSES.FILLED_SLOT}`);
        
        filledSlots.forEach(slot => {
            const slotIndex = parseInt(slot.dataset.slotIndex, 10);
            if (!isNaN(slotIndex)) {
                const hour = Math.floor(slotIndex / SLOT_CONFIG.SLOTS_PER_HOUR);
                if (hour >= 0 && hour < 24) {
                    hourlyStats[hour]++;
                }
            }
        });
        
        return hourlyStats;
    }

    /**
     * 가장 활동적인 시간대 반환
     * @returns {Object} 최고 활동 시간대 정보
     */
    getMostActiveHour() {
        const hourlyStats = this.calculateHourlyStatistics();
        let maxSlots = 0;
        let maxHour = 0;
        
        hourlyStats.forEach((slots, hour) => {
            if (slots > maxSlots) {
                maxSlots = slots;
                maxHour = hour;
            }
        });
        
        return {
            hour: maxHour,
            slots: maxSlots,
            timeRange: `${maxHour.toString().padStart(2, '0')}:00-${(maxHour + 1).toString().padStart(2, '0')}:00`,
            percentage: maxSlots > 0 ? Math.round((maxSlots / SLOT_CONFIG.SLOTS_PER_HOUR) * 100) : 0
        };
    }

    /**
     * 연속된 활동 블록 분석
     * @returns {Array<Object>} 연속 활동 블록 정보
     */
    analyzeContinuousBlocks() {
        const filledSlots = [];
        document.querySelectorAll(`.${CSS_CLASSES.TIME_SLOT}.${CSS_CLASSES.FILLED_SLOT}`).forEach(slot => {
            const slotIndex = parseInt(slot.dataset.slotIndex, 10);
            if (!isNaN(slotIndex)) {
                filledSlots.push(slotIndex);
            }
        });
        
        const groups = SlotUtils.groupConsecutiveSlots(filledSlots);
        
        return groups.map(group => ({
            startIndex: group[0],
            endIndex: group[group.length - 1],
            duration: group.length,
            timeRange: `${SlotUtils.indexToTimeString(group[0])}-${SlotUtils.indexToTimeString(group[group.length - 1] + 1)}`,
            durationText: SlotUtils.slotsToTimeString(group.length)
        }));
    }
}

/**
 * 통계 갱신 디바운스 함수 생성
 * @param {StatisticsManager} statsManager - 통계 관리자 인스턴스
 * @returns {Function} 디바운스된 갱신 함수
 */
export function createDebouncedStatsUpdater(statsManager) {
    return debounce(() => {
        statsManager.updateStatistics();
    }, UI_CONFIG.DEBOUNCE_DELAY);
}

/**
 * 글로벌 통계 관리자 인스턴스
 */
export const statisticsManager = new StatisticsManager(); 