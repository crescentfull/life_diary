/**
 * 통계 앱 설정 파일
 */

const StatsConfig = {
    // API 엔드포인트
    API: {
        DAILY: '/stats/api/daily/',
        WEEKLY: '/stats/api/weekly/',
        MONTHLY: '/stats/api/monthly/',
        TAGS: '/stats/api/tags/'
    },
    
    // 차트 설정
    CHART: {
        // 기본 차트 옵션
        DEFAULT_OPTIONS: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        },
        
        // 색상 팔레트
        COLORS: {
            PRIMARY: 'rgba(54, 162, 235, 0.6)',
            PRIMARY_BORDER: 'rgba(54, 162, 235, 1)',
            SUCCESS: 'rgba(75, 192, 192, 0.6)',
            SUCCESS_BORDER: 'rgba(75, 192, 192, 1)',
            WARNING: 'rgba(255, 206, 86, 0.6)',
            WARNING_BORDER: 'rgba(255, 206, 86, 1)',
            DANGER: 'rgba(255, 99, 132, 0.6)',
            DANGER_BORDER: 'rgba(255, 99, 132, 1)',
            INFO: 'rgba(153, 102, 255, 0.6)',
            INFO_BORDER: 'rgba(153, 102, 255, 1)'
        },
        
        // 차트별 특별 설정
        PIE_OPTIONS: {
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const hours = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((hours / total) * 100).toFixed(1);
                            return `${context.label}: ${hours}시간 (${percentage}%)`;
                        }
                    }
                }
            }
        },
        
        BAR_OPTIONS: {
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        },
        
        HOURLY_BAR_OPTIONS: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 6
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        },
        
        LINE_OPTIONS: {
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        },
        
        HORIZONTAL_BAR_OPTIONS: {
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    },
    
    // 시간 관련 상수
    TIME: {
        SLOT_DURATION: 10, // 분
        SLOTS_PER_HOUR: 6,
        TOTAL_SLOTS: 144, // 24시간 * 6슬롯
        HOURS_PER_DAY: 24
    },
    
    // 메시지
    MESSAGES: {
        LOADING: '로딩 중...',
        NO_DATA: '데이터가 없습니다',
        ERROR: '데이터를 불러오는 중 오류가 발생했습니다',
        NO_ANALYSIS_DATA: '분석할 데이터가 없습니다',
        NO_RECORD_FOR_DATE: '선택한 날짜에 기록된 데이터가 없습니다.'
    },
    
    // 날짜 형식
    DATE_FORMAT: {
        API: 'YYYY-MM-DD',
        DISPLAY: 'YYYY년 MM월 DD일',
        SHORT: 'MM/DD'
    },
    
    // 요일 이름
    DAY_NAMES: {
        KOREAN: ['월', '화', '수', '목', '금', '토', '일'],
        ENGLISH: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    }
};

// 전역으로 사용할 수 있도록 window 객체에 추가
if (typeof window !== 'undefined') {
    window.StatsConfig = StatsConfig;
}

// Node.js 환경에서 사용할 경우
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatsConfig;
} 