#!/bin/bash

# CropGuard Performance Testing Script
# This script runs comprehensive performance tests on the CropGuard application

set -e

echo "🚀 CropGuard Performance Testing Suite"
echo "======================================"

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
RESULTS_DIR="./performance/results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create results directory
mkdir -p "$RESULTS_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if service is running
check_service() {
    local url=$1
    local name=$2
    
    echo -n "Checking $name... "
    if curl -s "$url/health" > /dev/null; then
        echo -e "${GREEN}✓ Running${NC}"
        return 0
    else
        echo -e "${RED}✗ Not running${NC}"
        return 1
    fi
}

# Function to install k6 if not present
install_k6() {
    if ! command -v k6 &> /dev/null; then
        echo -e "${YELLOW}k6 not found. Installing...${NC}"
        
        # Detect OS and install k6
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo gpg -k
            sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
            echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
            sudo apt-get update
            sudo apt-get install k6
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            if command -v brew &> /dev/null; then
                brew install k6
            else
                echo -e "${RED}Please install Homebrew first or install k6 manually${NC}"
                exit 1
            fi
        elif [[ "$OSTYPE" == "msys" ]]; then
            echo -e "${YELLOW}Please install k6 manually from https://k6.io/docs/getting-started/installation/${NC}"
            exit 1
        fi
    fi
}

# Function to run load test
run_load_test() {
    echo -e "\n${YELLOW}📊 Running Load Test...${NC}"
    echo "Testing with gradually increasing load up to 50 concurrent users"
    
    k6 run \
        --out json="$RESULTS_DIR/load-test-$TIMESTAMP.json" \
        --env BASE_URL="$BASE_URL" \
        --env FRONTEND_URL="$FRONTEND_URL" \
        performance/load-test.js
    
    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ Load test completed successfully${NC}"
    else
        echo -e "${RED}✗ Load test failed with exit code $exit_code${NC}"
    fi
    
    return $exit_code
}

# Function to run stress test
run_stress_test() {
    echo -e "\n${YELLOW}💪 Running Stress Test...${NC}"
    echo "Testing with high load up to 400 concurrent users to find breaking point"
    
    k6 run \
        --out json="$RESULTS_DIR/stress-test-$TIMESTAMP.json" \
        --env BASE_URL="$BASE_URL" \
        --env FRONTEND_URL="$FRONTEND_URL" \
        performance/stress-test.js
    
    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ Stress test completed successfully${NC}"
    else
        echo -e "${RED}✗ Stress test failed with exit code $exit_code${NC}"
    fi
    
    return $exit_code
}

# Function to run spike test
run_spike_test() {
    echo -e "\n${YELLOW}⚡ Running Spike Test...${NC}"
    echo "Testing with sudden load spikes to test system resilience"
    
    cat > performance/spike-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '10s', target: 10 }, // Normal load
    { duration: '1s', target: 100 },  // Spike to 100 users
    { duration: '10s', target: 100 }, // Stay at 100 users
    { duration: '1s', target: 10 },  // Drop back to 10 users
    { duration: '10s', target: 10 }, // Stay at 10 users
    { duration: '1s', target: 200 }, // Spike to 200 users
    { duration: '10s', target: 200 }, // Stay at 200 users
    { duration: '1s', target: 0 },   // Drop to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function() {
  const response = http.get(`${BASE_URL}/health`);
  check(response, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
EOF

    k6 run \
        --out json="$RESULTS_DIR/spike-test-$TIMESTAMP.json" \
        --env BASE_URL="$BASE_URL" \
        performance/spike-test.js
    
    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ Spike test completed successfully${NC}"
    else
        echo -e "${RED}✗ Spike test failed with exit code $exit_code${NC}"
    fi
    
    # Clean up temporary file
    rm -f performance/spike-test.js
    
    return $exit_code
}

# Function to generate performance report
generate_report() {
    echo -e "\n${YELLOW}📋 Generating Performance Report...${NC}"
    
    cat > "$RESULTS_DIR/performance-report-$TIMESTAMP.md" << EOF
# CropGuard Performance Test Report

**Test Date:** $(date)
**Environment:** $BASE_URL

## Test Summary

### Load Test Results
- **Test File:** load-test-$TIMESTAMP.json
- **Description:** Gradual load increase up to 50 concurrent users
- **Duration:** ~4 minutes

### Stress Test Results  
- **Test File:** stress-test-$TIMESTAMP.json
- **Description:** High load up to 400 concurrent users
- **Duration:** ~29 minutes

### Spike Test Results
- **Test File:** spike-test-$TIMESTAMP.json  
- **Description:** Sudden load spikes to test resilience
- **Duration:** ~1 minute

## Key Metrics Monitored

- **Response Time:** HTTP request duration percentiles
- **Error Rate:** Failed request percentage
- **Throughput:** Requests per second
- **Resource Usage:** Memory and CPU utilization

## Recommendations

Based on test results:

1. **Database Optimization:** Monitor query performance under load
2. **Caching Strategy:** Implement response caching for frequently accessed data
3. **Connection Pooling:** Optimize database connection management
4. **Rate Limiting:** Ensure rate limiting doesn't impact legitimate users
5. **Monitoring:** Set up application performance monitoring

## Next Steps

1. Review detailed results in JSON files
2. Compare with baseline performance metrics
3. Implement optimizations based on findings
4. Run tests again to validate improvements

---

*Generated by CropGuard Performance Testing Suite*
EOF

    echo -e "${GREEN}✓ Performance report generated: $RESULTS_DIR/performance-report-$TIMESTAMP.md${NC}"
}

# Main execution
main() {
    echo "Starting performance tests at $(date)"
    
    # Check prerequisites
    install_k6
    
    # Check if services are running
    if ! check_service "$BASE_URL" "Backend API"; then
        echo -e "${RED}Backend service is not running. Please start it first.${NC}"
        echo "Run: cd backend && npm start"
        exit 1
    fi
    
    if ! check_service "$FRONTEND_URL" "Frontend"; then
        echo -e "${YELLOW}Frontend service is not running. Some tests may be limited.${NC}"
    fi
    
    # Run tests
    local all_passed=true
    
    if run_load_test; then
        echo -e "${GREEN}✓ Load test passed${NC}"
    else
        all_passed=false
        echo -e "${RED}✗ Load test failed${NC}"
    fi
    
    echo -e "\nWaiting 30 seconds before next test..."
    sleep 30
    
    if run_stress_test; then
        echo -e "${GREEN}✓ Stress test passed${NC}"
    else
        all_passed=false
        echo -e "${RED}✗ Stress test failed${NC}"
    fi
    
    echo -e "\nWaiting 30 seconds before next test..."
    sleep 30
    
    if run_spike_test; then
        echo -e "${GREEN}✓ Spike test passed${NC}"
    else
        all_passed=false
        echo -e "${RED}✗ Spike test failed${NC}"
    fi
    
    # Generate report
    generate_report
    
    # Final summary
    echo -e "\n${YELLOW}🏁 Performance Testing Complete${NC}"
    echo "======================================"
    
    if $all_passed; then
        echo -e "${GREEN}✅ All performance tests passed!${NC}"
        echo -e "Results saved in: $RESULTS_DIR/"
        exit 0
    else
        echo -e "${RED}❌ Some performance tests failed${NC}"
        echo -e "Check results in: $RESULTS_DIR/"
        exit 1
    fi
}

# Handle script arguments
case "${1:-all}" in
    "load")
        install_k6
        check_service "$BASE_URL" "Backend API" || exit 1
        run_load_test
        ;;
    "stress")
        install_k6
        check_service "$BASE_URL" "Backend API" || exit 1
        run_stress_test
        ;;
    "spike")
        install_k6
        check_service "$BASE_URL" "Backend API" || exit 1
        run_spike_test
        ;;
    "all"|*)
        main
        ;;
esac