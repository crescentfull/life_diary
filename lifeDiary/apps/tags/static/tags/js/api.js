/**
 * API 통신 관리자
 * @fileoverview RESTful API 통신을 담당하는 클래스입니다
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
 * API 통신 관리 클래스
 */
export class ApiClient {
    constructor() {
        this.baseUrl = API_CONFIG.BASE_URL;
        this.timeout = API_CONFIG.TIMEOUT;
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
                    'X-CSRFToken': getCookie('csrftoken'),
                    'Content-Type': 'application/json',
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
            throw new ApiError(MESSAGES.ERROR.NETWORK_ERROR, 0, null);
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
                return MESSAGES.ERROR.VALIDATION_FAILED;
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
     * @returns {Promise<Object>} API 응답
     */
    async get(endpoint = '') {
        const url = `${this.baseUrl}${endpoint}`;
        return this._request(url, { method: 'GET' });
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
     * @returns {Promise<Object>} API 응답
     */
    async delete(endpoint = '') {
        const url = `${this.baseUrl}${endpoint}`;
        return this._request(url, { method: 'DELETE' });
    }
}

/**
 * 태그 API 서비스 클래스
 */
export class TagApiService {
    constructor(apiClient = new ApiClient()) {
        this.api = apiClient;
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
        return result;
    }

    /**
     * 태그 삭제
     * @param {number} id - 태그 ID
     * @returns {Promise<Object>} 삭제 결과
     */
    async deleteTag(id) {
        const result = await this.api.delete(`${id}/`);
        return result;
    }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const tagApiService = new TagApiService(); 