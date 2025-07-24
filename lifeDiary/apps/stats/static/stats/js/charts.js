/**
 * 차트 렌더링 관련 함수들
 */

class StatsCharts {
    constructor() {
        this.config = window.StatsConfig || {};
        this.charts = {}; // 차트 인스턴스들을 저장
    }
    
    /**
     * 기존 차트 삭제
     * @param {string} chartId - 차트 ID
     */
    destroyChart(chartId) {
        if (this.charts[chartId]) {
            this.charts[chartId].destroy();
            delete this.charts[chartId];
        }
    }
    
    /**
     * 데이터 없음 메시지 표시
     * @param {HTMLCanvasElement} canvas - 캔버스 요소
     * @param {string} message - 표시할 메시지
     */
    showNoDataMessage(canvas, message = null) {
        const ctx = canvas.getContext('2d');
        const msg = message || this.config.MESSAGES?.NO_DATA || '데이터가 없습니다';
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#6c757d';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(msg, canvas.width / 2, canvas.height / 2);
    }
    
    /**
     * 일별 파이 차트 렌더링
     * @param {Array} tagStats - 태그별 통계 데이터
     */
    renderDailyPieChart(tagStats) {
        const canvas = document.getElementById('dailyPieChart');
        if (!canvas) return;
        
        this.destroyChart('dailyPie');
        
        if (!tagStats || tagStats.length === 0) {
            this.showNoDataMessage(canvas);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        this.charts.dailyPie = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: tagStats.map(tag => tag.name),
                datasets: [{
                    data: tagStats.map(tag => tag.hours),
                    backgroundColor: tagStats.map(tag => tag.color),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                ...this.config.CHART?.DEFAULT_OPTIONS,
                ...this.config.CHART?.PIE_OPTIONS
            }
        });
    }
    
    /**
     * 시간대별 막대 차트 렌더링
     * @param {Array} hourlyStats - 시간대별 통계 데이터
     */
    renderHourlyBarChart(hourlyStats) {
        const canvas = document.getElementById('hourlyBarChart');
        if (!canvas) return;
        
        this.destroyChart('hourlyBar');
        
        const ctx = canvas.getContext('2d');
        const hours = Array.from({length: 24}, (_, i) => `${i}시`);
        
        this.charts.hourlyBar = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: hours,
                datasets: [{
                    label: '활동량 (10분 단위)',
                    data: hourlyStats || new Array(24).fill(0),
                    backgroundColor: this.config.CHART?.COLORS?.PRIMARY,
                    borderColor: this.config.CHART?.COLORS?.PRIMARY_BORDER,
                    borderWidth: 1
                }]
            },
            options: {
                ...this.config.CHART?.DEFAULT_OPTIONS,
                ...this.config.CHART?.HOURLY_BAR_OPTIONS
            }
        });
    }
    
    /**
     * 주간 라인 차트 렌더링
     * @param {Array} tagStats - 태그별 주간 통계
     * @param {Array} weeklyData - 주간 데이터
     */
    renderWeeklyLineChart(tagStats, weeklyData) {
        const canvas = document.getElementById('weeklyLineChart');
        if (!canvas) return;
        
        this.destroyChart('weeklyLine');
        
        if (!weeklyData || weeklyData.length === 0) {
            this.showNoDataMessage(canvas);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        const days = weeklyData.map(day => day.day_korean);
        
        this.charts.weeklyLine = new Chart(ctx, {
            type: 'line',
            data: {
                labels: days,
                datasets: (tagStats || []).map(tag => ({
                    label: tag.name,
                    data: tag.daily_hours,
                    borderColor: tag.color,
                    backgroundColor: tag.color + '20',
                    tension: 0.4,
                    fill: false
                }))
            },
            options: {
                ...this.config.CHART?.DEFAULT_OPTIONS,
                ...this.config.CHART?.LINE_OPTIONS
            }
        });
    }
    
    /**
     * 주간 막대 차트 렌더링
     * @param {Array} weeklyData - 주간 데이터
     */
    renderWeeklyBarChart(weeklyData) {
        const canvas = document.getElementById('weeklyBarChart');
        if (!canvas) return;
        
        this.destroyChart('weeklyBar');
        
        if (!weeklyData || weeklyData.length === 0) {
            this.showNoDataMessage(canvas);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        this.charts.weeklyBar = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: weeklyData.map(day => day.day_korean),
                datasets: [{
                    label: '활동 시간',
                    data: weeklyData.map(day => day.total_minutes / 60),
                    backgroundColor: this.config.CHART?.COLORS?.SUCCESS,
                    borderColor: this.config.CHART?.COLORS?.SUCCESS_BORDER,
                    borderWidth: 1
                }]
            },
            options: {
                ...this.config.CHART?.DEFAULT_OPTIONS,
                ...this.config.CHART?.BAR_OPTIONS
            }
        });
    }
    
    /**
     * 월간 막대 차트 렌더링
     * @param {Array} tagStats - 월간 태그 통계
     */
    renderMonthlyBarChart(tagStats) {
        const canvas = document.getElementById('monthlyBarChart');
        if (!canvas) return;
        
        this.destroyChart('monthlyBar');
        
        if (!tagStats || tagStats.length === 0) {
            this.showNoDataMessage(canvas);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        this.charts.monthlyBar = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: tagStats.map(tag => tag.name),
                datasets: [{
                    label: '사용 시간',
                    data: tagStats.map(tag => tag.total_hours),
                    backgroundColor: tagStats.map(tag => tag.color),
                    borderWidth: 1
                }]
            },
            options: {
                ...this.config.CHART?.DEFAULT_OPTIONS,
                ...this.config.CHART?.BAR_OPTIONS
            }
        });
    }
    
    /**
     * 태그 총 사용시간 차트 렌더링
     * @param {Array} tagAnalysis - 태그 분석 데이터
     */
    renderTagTotalChart(tagAnalysis) {
        const canvas = document.getElementById('tagTotalChart');
        if (!canvas) return;
        
        this.destroyChart('tagTotal');
        
        if (!tagAnalysis || tagAnalysis.length === 0) {
            this.showNoDataMessage(canvas);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        const top10 = tagAnalysis.slice(0, 10);
        
        this.charts.tagTotal = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: top10.map(tag => tag.name),
                datasets: [{
                    label: '총 시간 (시간)',
                    data: top10.map(tag => tag.total_hours),
                    backgroundColor: top10.map(tag => tag.color),
                    borderWidth: 1
                }]
            },
            options: {
                ...this.config.CHART?.DEFAULT_OPTIONS,
                ...this.config.CHART?.HORIZONTAL_BAR_OPTIONS
            }
        });
    }
    
    /**
     * 태그 사용 빈도 차트 렌더링
     * @param {Array} tagAnalysis - 태그 분석 데이터
     */
    renderTagFrequencyChart(tagAnalysis) {
        const canvas = document.getElementById('tagFrequencyChart');
        if (!canvas) return;
        
        this.destroyChart('tagFreq');
        
        if (!tagAnalysis || tagAnalysis.length === 0) {
            this.showNoDataMessage(canvas);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        this.charts.tagFreq = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: tagAnalysis.map(tag => tag.name),
                datasets: [{
                    data: tagAnalysis.map(tag => tag.usage_frequency),
                    backgroundColor: tagAnalysis.map(tag => tag.color),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                ...this.config.CHART?.DEFAULT_OPTIONS,
                plugins: {
                    ...this.config.CHART?.DEFAULT_OPTIONS?.plugins,
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed}%`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * 모든 차트 삭제
     */
    destroyAllCharts() {
        Object.keys(this.charts).forEach(chartId => {
            this.destroyChart(chartId);
        });
    }
    
    /**
     * 차트 크기 업데이트 (반응형)
     */
    resizeCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }
}

// 전역 인스턴스 생성
if (typeof window !== 'undefined') {
    window.statsCharts = new StatsCharts();
    
    // 윈도우 리사이즈 시 차트 크기 업데이트
    window.addEventListener('resize', () => {
        if (window.statsCharts) {
            window.statsCharts.resizeCharts();
        }
    });
} 