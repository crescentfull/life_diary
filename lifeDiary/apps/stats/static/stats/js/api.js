/**
 * 통계 API 관련 함수들
 */

class StatsAPI {
    constructor() {
        this.config = window.StatsConfig || {};
    }
    
    /**
     * 기본 API 호출 함수
     * @param {string} url - API 엔드포인트
     * @param {Object} params - 쿼리 파라미터
     * @returns {Promise<Object>} API 응답 데이터
     */
    async fetchAPI(url, params = {}) {
        try {
            const urlObj = new URL(url, window.location.origin);
            
            // 쿼리 파라미터 추가
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined) {
                    urlObj.searchParams.append(key, params[key]);
                }
            });
            
            const response = await fetch(urlObj.toString());
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'API 호출에 실패했습니다');
            }
            
            return data;
        } catch (error) {
            console.error('API 호출 오류:', error);
            throw error;
        }
    }
    
    /**
     * 일별 통계 데이터 가져오기
     * @param {string} date - 날짜 (YYYY-MM-DD)
     * @returns {Promise<Object>} 일별 통계 데이터
     */
    async getDailyStats(date) {
        return await this.fetchAPI(this.config.API?.DAILY || '/stats/api/daily/', { date });
    }
    
    /**
     * 주간 통계 데이터 가져오기
     * @param {string} date - 기준 날짜 (YYYY-MM-DD)
     * @returns {Promise<Object>} 주간 통계 데이터
     */
    async getWeeklyStats(date) {
        return await this.fetchAPI(this.config.API?.WEEKLY || '/stats/api/weekly/', { date });
    }
    
    /**
     * 월간 통계 데이터 가져오기
     * @param {string} date - 기준 날짜 (YYYY-MM-DD)
     * @returns {Promise<Object>} 월간 통계 데이터
     */
    async getMonthlyStats(date) {
        return await this.fetchAPI(this.config.API?.MONTHLY || '/stats/api/monthly/', { date });
    }
    
    /**
     * 태그 분석 데이터 가져오기
     * @returns {Promise<Object>} 태그 분석 데이터
     */
    async getTagAnalysis() {
        return await this.fetchAPI(this.config.API?.TAGS || '/stats/api/tags/');
    }
    
    /**
     * 에러 핸들링을 포함한 안전한 API 호출
     * @param {Function} apiCall - 실행할 API 함수
     * @param {Function} onSuccess - 성공 시 콜백 함수
     * @param {Function} onError - 에러 시 콜백 함수
     */
    async safeApiCall(apiCall, onSuccess, onError) {
        try {
            const data = await apiCall();
            if (onSuccess) {
                onSuccess(data);
            }
            return data;
        } catch (error) {
            console.error('API 호출 오류:', error);
            if (onError) {
                onError(error);
            } else {
                // 기본 에러 처리
                this.showError(error.message || this.config.MESSAGES?.ERROR || '데이터를 불러오는 중 오류가 발생했습니다');
            }
            throw error;
        }
    }
    
    /**
     * 에러 메시지 표시
     * @param {string} message - 에러 메시지
     */
    showError(message) {
        // 간단한 에러 알림 표시
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger alert-dismissible fade show';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // 페이지 상단에 에러 메시지 삽입
        const container = document.querySelector('.container-fluid') || document.body;
        container.insertBefore(errorDiv, container.firstChild);
        
        // 5초 후 자동 제거
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
    
    /**
     * 로딩 상태 표시/숨김
     * @param {Element} element - 로딩을 표시할 요소
     * @param {boolean} show - 표시 여부
     */
    showLoading(element, show = true) {
        if (!element) return;
        
        if (show) {
            element.innerHTML = `
                <div class="d-flex justify-content-center align-items-center" style="min-height: 100px;">
                    <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                    ${this.config.MESSAGES?.LOADING || '로딩 중...'}
                </div>
            `;
        }
    }
}

// 전역 인스턴스 생성
if (typeof window !== 'undefined') {
    window.statsAPI = new StatsAPI();
} 