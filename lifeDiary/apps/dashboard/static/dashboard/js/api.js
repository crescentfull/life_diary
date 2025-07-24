/**
 * API 통신 관리자
 * @fileoverview 대시보드 API 통신을 담당하는 클래스들입니다
 */

import { API_CONFIG, MESSAGES } from './config.js';
import { getCookie } from './utils.js';

/**
 * HTTP 응답 에러 클래스
 */
class ApiError extends Error {
    constructor(message, status, response) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.response = response;
    }
}

/**
 * 기본 API 클라이언트 클래스
 */
export class ApiClient {
    constructor(baseUrl, timeout = API_CONFIG.TIMEOUT) {
        this.baseUrl = baseUrl;
        this.timeout = timeout;
    }

    /**
     * HTTP 요청 공통 처리
     * @param {string} url - 요청 URL
     * @param {Object} options - fetch 옵션
     * @returns {Promise<Object>} API 응답
     * @private
     */
    async _request(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                    ...options.headers
                },
                signal: controller.signal
            };

            const response = await fetch(url, { ...defaultOptions, ...options });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new ApiError(
                    this._getErrorMessage(response.status),
                    response.status,
                    response
                );
            }

            const result = await response.json();

            // 서버에서 success: false로 응답한 경우
            if (result.hasOwnProperty('success') && result.success === false) {
                throw new ApiError(
                    result.message || MESSAGES.ERROR.SERVER_ERROR,
                    response.status,
                    result
                );
            }

            return result;
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new ApiError(MESSAGES.ERROR.NETWORK_ERROR, 408, null);
            }
            
            if (error instanceof ApiError) {
                throw error;
            }
            
            // 네트워크 오류 등
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new ApiError(MESSAGES.ERROR.NETWORK_ERROR, 0, null);
            }
            
            throw new ApiError(error.message, 0, null);
        }
    }

    /**
     * HTTP 상태 코드에 따른 에러 메시지 반환
     * @param {number} status - HTTP 상태 코드
     * @returns {string} 에러 메시지
     * @private
     */
    _getErrorMessage(status) {
        switch (status) {
            case 400:
                return MESSAGES.ERROR.LOAD_FAILED;
            case 403:
                return MESSAGES.ERROR.PERMISSION_DENIED;
            case 404:
                return MESSAGES.ERROR.NOT_FOUND;
            case 500:
                return MESSAGES.ERROR.SERVER_ERROR;
            default:
                return `HTTP error! status: ${status}`;
        }
    }

    /**
     * GET 요청
     * @param {string} endpoint - API 엔드포인트
     * @param {Object} params - 쿼리 파라미터
     * @returns {Promise<Object>} API 응답
     */
    async get(endpoint = '', params = {}) {
        const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });
        
        return this._request(url.toString(), { method: 'GET' });
    }

    /**
     * POST 요청
     * @param {string} endpoint - API 엔드포인트
     * @param {Object} data - 전송할 데이터
     * @returns {Promise<Object>} API 응답
     */
    async post(endpoint = '', data = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        return this._request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT 요청
     * @param {string} endpoint - API 엔드포인트
     * @param {Object} data - 전송할 데이터
     * @returns {Promise<Object>} API 응답
     */
    async put(endpoint = '', data = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        return this._request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE 요청
     * @param {string} endpoint - API 엔드포인트
     * @param {Object} data - 전송할 데이터 (선택적)
     * @returns {Promise<Object>} API 응답
     */
    async delete(endpoint = '', data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = { method: 'DELETE' };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        return this._request(url, options);
    }
}

/**
 * 슬롯 API 서비스 클래스
 */
export class SlotApiService {
    constructor() {
        this.api = new ApiClient(API_CONFIG.DASHBOARD_BASE_URL);
    }

    /**
     * 특정 슬롯의 데이터 조회
     * @param {number} slotIndex - 슬롯 인덱스
     * @param {string} date - 날짜 (YYYY-MM-DD)
     * @returns {Promise<Object>} 슬롯 데이터
     */
    async getSlotData(slotIndex, date) {
        return this.api.get(`blocks/${slotIndex}/`, { date });
    }

    /**
     * 시간 블록 목록 조회
     * @param {string} date - 날짜 (YYYY-MM-DD)
     * @returns {Promise<Array>} 시간 블록 목록
     */
    async getTimeBlocks(date) {
        const result = await this.api.get('blocks/', { date });
        return result.data || [];
    }

    /**
     * 시간 블록 생성/저장
     * @param {Object} blockData - 블록 데이터
     * @param {number[]} blockData.slot_indexes - 슬롯 인덱스 배열
     * @param {number} blockData.tag_id - 태그 ID
     * @param {string} blockData.memo - 메모
     * @param {string} blockData.date - 날짜
     * @returns {Promise<Object>} 저장 결과
     */
    async saveTimeBlocks(blockData) {
        const result = await this.api.post('blocks/', blockData);
        
        // 성공 메시지에 슬롯 개수 추가
        if (result.success && blockData.slot_indexes) {
            result.message = `${blockData.slot_indexes.length}${MESSAGES.SUCCESS.SLOT_SAVED}`;
        }
        
        return result;
    }

    /**
     * 시간 블록 삭제
     * @param {Object} deleteData - 삭제 데이터
     * @param {number[]} deleteData.slot_indexes - 삭제할 슬롯 인덱스 배열
     * @param {string} deleteData.date - 날짜
     * @returns {Promise<Object>} 삭제 결과
     */
    async deleteTimeBlocks(deleteData) {
        const result = await this.api.delete('blocks/', deleteData);
        
        // 성공 메시지에 슬롯 개수 추가
        if (result.success && deleteData.slot_indexes) {
            result.message = `${deleteData.slot_indexes.length}${MESSAGES.SUCCESS.SLOT_DELETED}`;
        }
        
        return result;
    }
}

/**
 * 태그 API 서비스 클래스
 */
export class TagApiService {
    constructor() {
        this.api = new ApiClient(API_CONFIG.TAGS_BASE_URL);
    }

    /**
     * 모든 태그 조회
     * @returns {Promise<Array>} 태그 목록
     */
    async getTags() {
        const result = await this.api.get();
        return result.tags || [];
    }

    /**
     * 특정 태그 조회
     * @param {number} id - 태그 ID
     * @returns {Promise<Object>} 태그 정보
     */
    async getTag(id) {
        const result = await this.api.get(`${id}/`);
        return result.tag;
    }

    /**
     * 새 태그 생성
     * @param {Object} tagData - 태그 데이터
     * @param {string} tagData.name - 태그명
     * @param {string} tagData.color - 태그 색상
     * @param {boolean} [tagData.is_default=false] - 기본 태그 여부
     * @returns {Promise<Object>} 생성된 태그 정보
     */
    async createTag(tagData) {
        const result = await this.api.post('', tagData);
        
        if (result.success) {
            result.message = MESSAGES.SUCCESS.TAG_CREATED;
        }
        
        return result;
    }

    /**
     * 태그 수정
     * @param {number} id - 태그 ID
     * @param {Object} tagData - 수정할 태그 데이터
     * @returns {Promise<Object>} 수정된 태그 정보
     */
    async updateTag(id, tagData) {
        const result = await this.api.put(`${id}/`, tagData);
        
        if (result.success) {
            result.message = MESSAGES.SUCCESS.TAG_UPDATED;
        }
        
        return result;
    }

    /**
     * 태그 삭제
     * @param {number} id - 태그 ID
     * @returns {Promise<Object>} 삭제 결과
     */
    async deleteTag(id) {
        const result = await this.api.delete(`${id}/`);
        
        if (result.success) {
            result.message = MESSAGES.SUCCESS.TAG_DELETED;
        }
        
        return result;
    }
}

/**
 * 통합 API 서비스 클래스
 * 여러 API 서비스를 하나로 통합하여 사용하기 편하게 만듦
 */
export class DashboardApiService {
    constructor() {
        this.slots = new SlotApiService();
        this.tags = new TagApiService();
    }

    /**
     * API 상태 확인
     * @returns {Promise<boolean>} API 사용 가능 여부
     */
    async checkHealth() {
        try {
            await this.tags.getTags();
            return true;
        } catch (error) {
            console.warn('API 상태 확인 실패:', error);
            return false;
        }
    }

    /**
     * 재시도 로직이 포함된 안전한 API 호출
     * @param {Function} apiCall - 실행할 API 호출 함수
     * @param {number} maxRetries - 최대 재시도 횟수
     * @param {number} delay - 재시도 간격 (ms)
     * @returns {Promise<any>} API 호출 결과
     */
    async withRetry(apiCall, maxRetries = API_CONFIG.RETRY_COUNT, delay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await apiCall();
            } catch (error) {
                lastError = error;
                
                // 마지막 시도가 아니면 재시도
                if (attempt < maxRetries) {
                    console.warn(`API 호출 실패 (${attempt}/${maxRetries}), ${delay}ms 후 재시도:`, error);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // 지수 백오프
                } else {
                    console.error(`API 호출 최종 실패 (${maxRetries}번 시도):`, error);
                }
            }
        }
        
        throw lastError;
    }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const dashboardApi = new DashboardApiService();
export const slotApi = new SlotApiService();
export const tagApi = new TagApiService(); 